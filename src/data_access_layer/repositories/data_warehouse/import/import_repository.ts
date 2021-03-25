import RepositoryInterface, {QueryOptions, Repository} from "../../repository";
import Import, {DataStaging} from "../../../../data_warehouse/import/import";
import Result from "../../../../result";
import ImportMapper from "../../../mappers/data_warehouse/import/import_mapper";
import {PoolClient} from "pg";
import {User} from "../../../../access_management/user";
import DataStagingRepository from "./data_staging_repository";
import DataSourceStorage from "../../../mappers/data_warehouse/import/data_source_storage";
import TypeMappingRepository from "../etl/type_mapping_repository";
import TypeMapping from "../../../../data_warehouse/etl/type_mapping";
import Logger from "../../../../services/logger";

export default class ImportRepository extends Repository implements RepositoryInterface<Import> {
    #mapper = ImportMapper.Instance
    delete(t: Import): Promise<Result<boolean>> {
        if(t.id){
           return this.#mapper.PermanentlyDelete(t.id)
        }

        return Promise.resolve(Result.Failure(`import must have id`))
    }

    findByID(id: string): Promise<Result<Import>> {
        return this.#mapper.Retrieve(id)
    }

    // locking is only done in the context of a transaction, so one must be included
    findByIDAndLock(id: string, transaction: PoolClient): Promise<Result<Import>> {
        return this.#mapper.RetrieveAndLock(id,transaction)
    }

    // locking is only done in the context of a transaction, so one must be included
    findLastAndLock(dataSourceID: string, transaction: PoolClient): Promise<Result<Import>> {
        return this.#mapper.RetrieveLastAndLock(dataSourceID, transaction)
    }

    // locking is only done in the context of a transaction, so one must be included
    findLast(dataSourceID: string): Promise<Result<Import>> {
        return this.#mapper.RetrieveLast(dataSourceID)
    }

    setStatus(importID: string, status: "ready" | "processing" | "error" | "stopped" | "completed", message?: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return this.#mapper.SetStatus(importID, status, message, transaction)
    }

    // We do NOT allow updates on an import, too much room for error
    async save(importRecord: Import, user: User): Promise<Result<boolean>> {
        const errors = await importRecord.validationErrors()
        if(errors) return Promise.resolve(Result.Failure(`import does not pass validation ${errors.join(",")}`))

        if(importRecord.id) {
           return Promise.resolve(Result.Failure(`updates are not allowed on an import that has already been created`))
        } else {
           const created = await this.#mapper.CreateImport(user.id!, importRecord)
           if(created.isError) return Promise.resolve(Result.Pass(created))


           Object.assign(importRecord, created.value)
        }

        return Promise.resolve(Result.Success(true))
    }

    // TODO: this will need to be reworked to handle larger payloads at some point, and to take advantage of Postgres's file copy
    async jsonImport(user:User, dataSourceID: string, payload:any): Promise<Result<Import>> {
        const stagingRepo = new DataStagingRepository()
        const dataSource = await DataSourceStorage.Instance.Retrieve(dataSourceID)
        const mappingRepo = new TypeMappingRepository()
        if(dataSource.isError) return new Promise(resolve => resolve(Result.Pass(dataSource)))

        if(!Array.isArray(payload)) return new Promise(resolve => resolve(Result.Failure("payload must be an array of JSON objects")))

        const newImport = await ImportMapper.Instance.CreateImport(user.id!, new Import({
            data_source_id: dataSourceID,
            reference: "manual upload"
        }))

        const records : DataStaging[] = []

        for(const data of payload) {
            const shapeHash = TypeMapping.objectToShapeHash(data)

            let mapping: TypeMapping

            const retrieved = await mappingRepo.findByShapeHash(shapeHash, dataSourceID)
            if(retrieved.isError) {
                const newMapping = new TypeMapping({
                    container_id: dataSource.value.container_id!,
                    data_source_id: dataSourceID,
                    sample_payload: data
                })

                const saved = await mappingRepo.save(newMapping, user)

                if(saved.isError) {
                    Logger.error(`unable to create new type mapping for imported data ${saved.error}`)
                    continue
                }

                mapping = newMapping
            } else {
                mapping = retrieved.value
            }

            records.push(new DataStaging({
                data_source_id: dataSourceID,
                import_id: newImport.value.id!,
                mapping_id: mapping.id!,
                data
            }))
        }

        const saved = await stagingRepo.bulkSave(records)
        if(saved.isError) return Promise.resolve(Result.Pass(saved))

        return new Promise(resolve => resolve(Result.Success(newImport.value)))
    }

    constructor() {
        super(ImportMapper.tableName);

        // in order to select the composite fields we must redo the initial query
        this._rawQuery = [
           `SELECT imports.*,
            SUM(CASE WHEN data_staging.inserted_at <> NULL AND data_staging.import_id = imports.id THEN 1 ELSE 0 END) AS records_inserted,
            SUM(CASE WHEN data_staging.import_id = imports.id THEN 1 ELSE 0 END) as total_records`
        ]
    }

    listIncompleteWithUninsertedData(dataSourceID: string): Promise<Result<Import[]>> {
        return this.#mapper.ListIncompleteWithUninsertedData(dataSourceID)
    }

    dataSourceID(operator: string, value: any) {
        super.query("imports.data_source_id", operator, value)
        return this
    }

    status(operator:string, value:  "ready" | "processing" | "error" | "stopped" | "completed") {
        super.query("imports.status", operator, value)
        return this
    }

    async count(): Promise<Result<number>> {
        const results = await super.count()

        // in order to select the composite fields we must redo the initial query
        this._rawQuery = [
            `SELECT imports.*,
            SUM(CASE WHEN data_staging.inserted_at <> NULL AND data_staging.import_id = imports.id THEN 1 ELSE 0 END) AS records_inserted,
            SUM(CASE WHEN data_staging.import_id = imports.id THEN 1 ELSE 0 END) as total_records`
        ]

        return Promise.resolve(Result.Pass(results))
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<Import[]>> {
        if(options) options.groupBy = "imports.id"

        const results = await super.findAll<Import>(options, {transaction, resultClass: Import})
        // in order to select the composite fields we must redo the initial query
        this._rawQuery = [
            `SELECT imports.*,
            SUM(CASE WHEN data_staging.inserted_at <> NULL AND data_staging.import_id = imports.id THEN 1 ELSE 0 END) AS records_inserted,
            SUM(CASE WHEN data_staging.import_id = imports.id THEN 1 ELSE 0 END) as total_records`
        ]

        return Promise.resolve(Result.Pass(results))
    }
}
