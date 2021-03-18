/*
* DataStagingStorage encompasses all logic dealing with the manipulation of the
* data_staging table in storage. Note that records should be inserted manually
* with caution. There are database triggers and other automated processes in place
* for taking data from the imports table and parsing it into the data_staging table.
 */
import Mapper from "../../mapper";
import {DataStagingT} from "../../../../types/import/dataStagingT";
import Result from "../../../../result";
import {QueryConfig} from "pg";
import PostgresAdapter from "../../db_adapters/postgres/postgres";
import {QueueProcessor} from "../../../../event_system/processor";
import Event from "../../../../event_system/event";

export default class DataStagingStorage extends Mapper {
    public static tableName = "data_staging";

    private static instance: DataStagingStorage;

    public static get Instance(): DataStagingStorage {
        if(!DataStagingStorage.instance) {
            DataStagingStorage.instance = new DataStagingStorage()
        }

        return DataStagingStorage.instance
    }

    private constructor() {
        super();
    }

    public async Create(dataSourceID: string, importID:string, typeMappingID: string, data: any): Promise<Result<boolean>> {
        return new Promise((resolve) => {
            PostgresAdapter.Instance.Pool.query(DataStagingStorage.createStatement(dataSourceID, importID, typeMappingID, data))
                .then(() => {
                    QueueProcessor.Instance.emit(new Event({
                        sourceID: dataSourceID,
                        sourceType: "data_source",
                        type: "data_imported"
                    }))

                    resolve(Result.Success(true))
                })
                .catch((e:Error) => resolve(Result.Failure(e.message)))
        })
    }

    public async Count(importID: string): Promise<Result<number>> {
        return super.count(DataStagingStorage.countImportStatement(importID))
    }

    public async CountUninsertedForImport(importID: string): Promise<Result<number>> {
        return super.count(DataStagingStorage.countUninsertedByImportStatement(importID))
    }

    // returns the count of records in an import that also contain an active type mapping
    // which contains transformations - used in the process loop
    public async CountUninsertedActiveMapping(importID: string): Promise<Result<number>> {
        return super.count(DataStagingStorage.countImportUninsertedActiveMappingStatement(importID))
    }

    public async Retrieve(id: number): Promise<Result<DataStagingT>> {
        return super.retrieve<DataStagingT>(DataStagingStorage.retrieveStatement(id))
    }

    public async List(importID: string, offset:number, limit:number, sortBy?:string, sortDesc?: boolean): Promise<Result<DataStagingT[]>>{
        if(limit === -1) {
            return super.rows<DataStagingT>(DataStagingStorage.listAllStatement(importID))
        }

        return super.rows<DataStagingT>(DataStagingStorage.listStatement(importID, offset, limit,sortBy, sortDesc))
    }

    public async ListUninserted(importID: string, offset:number, limit:number): Promise<Result<DataStagingT[]>>{
        return super.rows<DataStagingT>(DataStagingStorage.listUninsertedStatement(importID, offset, limit))
    }

    // list uninserted records which also have an active type mapping record along with transformations
    public async ListUninsertedActiveMapping(importID: string, offset:number, limit:number): Promise<Result<DataStagingT[]>>{
        return super.rows<DataStagingT>(DataStagingStorage.listUninsertedActiveMappingStatement(importID, offset, limit))
    }

    public async ListUninsertedByDataSource(dataSourceID: string, offset:number, limit:number): Promise<Result<DataStagingT[]>>{
        return super.rows<DataStagingT>(DataStagingStorage.listUninsertedByDataSourceStatement(dataSourceID, offset, limit))
    }

    public async CountUninsertedByDataSource(dataSourceID: string): Promise<Result<number>>{
        return super.count(DataStagingStorage.countUninsertedByDataSourceStatement(dataSourceID))
    }

    public async SetInsertedByImport(importID: string): Promise<Result<boolean>> {
        return super.runAsTransaction(DataStagingStorage.setInsertedByImportStatement(importID))
    }

    public async SetInserted(id: number): Promise<Result<boolean>> {
        return super.runAsTransaction(DataStagingStorage.setInsertedStatement(id))
    }

    public async PartialUpdate(id: number, userID:string, updatedField: {[key:string]: any}): Promise<Result<boolean>> {
        const toUpdate = await this.Retrieve(id);

        if(toUpdate.isError) {
            return new Promise(resolve => resolve(Result.Failure(toUpdate.error!.error)))
        }

        const updateStatement:string[] = [];
        const values:string[] = [];
        let i = 1;

        Object.keys(updatedField).map(k => {
            updateStatement.push(`${k} = $${i}`);
            values.push(updatedField[k]);
            i++
        });

        return new Promise(resolve => {
            PostgresAdapter.Instance.Pool.query({
                text: `UPDATE data_staging SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    public async PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.runStatement(DataStagingStorage.deleteStatement(id))
    }

    // completely overwrite the existing error set
    public SetErrors(id:number, errors: string[]): Promise<Result<boolean>> {
        return super.runAsTransaction(DataStagingStorage.setErrorsStatement(id, errors))
    }

    // add an error to an existing error set
    public AddError(id:number, errors: string): Promise<Result<boolean>> {
        return super.runAsTransaction(DataStagingStorage.addErrorsStatement(id, errors))
    }

    private static createStatement(dataSourceID: string, importID:string, typeMappingID: string, data: any): QueryConfig {
        return {
            text: `INSERT INTO data_staging(data_source_id,import_id,data,mapping_id) VALUES($1,$2,$3,$4)`,
            values: [dataSourceID, importID, data, typeMappingID]
        }
    }

    private static retrieveStatement(id: number): QueryConfig {
        return {
            text:`SELECT * FROM data_staging WHERE id = $1`,
            values: [id]
        }
    }

    private static listStatement(importID: string, offset: number, limit: number, sortBy?: string, sortDesc?:boolean): QueryConfig {
        if(sortDesc) {
            return {
                text: `SELECT * FROM data_staging WHERE import_id = $1 ORDER BY "${sortBy}" DESC OFFSET $2 LIMIT $3`,
                values: [importID, offset, limit]
            }
        } else if(sortBy) {
            return {
                text: `SELECT * FROM data_staging WHERE import_id = $1 ORDER BY "${sortBy}" ASC OFFSET $2 LIMIT $3`,
                values: [importID, offset, limit]
            }
        } else {
            return {
                text: `SELECT * FROM data_staging WHERE import_id = $1 OFFSET $2 LIMIT $3`,
                values: [importID, offset, limit]
            }
        }
    }

    private static listAllStatement(importID: string): QueryConfig {
        return {
            text: `SELECT * FROM data_staging WHERE import_id = $1`,
            values: [importID]
        }
    }

    private static listUninsertedStatement(importID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT * FROM data_staging WHERE import_id = $1 AND inserted_at IS NULL OFFSET $2 LIMIT $3`,
            values: [importID, offset, limit]
        }
    }

    private static listUninsertedActiveMappingStatement(importID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT data_staging.*
                   FROM data_staging
                   LEFT JOIN data_type_mappings ON data_type_mappings.id = data_staging.mapping_id
                   WHERE import_id = $1
                   AND inserted_at IS NULL
                   AND data_type_mappings.active IS TRUE
                   AND EXISTS (SELECT * from data_type_mapping_transformations WHERE data_type_mapping_transformations.type_mapping_id = data_staging.mapping_id)
                   OFFSET $2 LIMIT $3`,
            values: [importID, offset, limit]
        }
    }

    private static listUninsertedByDataSourceStatement(dataSourceID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT * FROM data_staging WHERE data_source_id = $1 AND inserted_at IS NULL AND mapping_id IS NULL OFFSET $2 LIMIT $3`,
            values: [dataSourceID, offset, limit]
        }
    }

    private static countUninsertedByDataSourceStatement(dataSourceID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_staging WHERE data_source_id = $1 AND inserted_at IS NULL AND mapping_id IS NULL`,
            values: [dataSourceID]
        }
    }

    private static countImportStatement(importID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_staging WHERE import_id = $1`,
            values: [importID]
        }
    }

    private static countUninsertedByImportStatement(importID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_staging WHERE inserted_at IS NULL AND import_id = $1`,
            values: [importID]
        }
    }

    private static countImportUninsertedActiveMappingStatement(importID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*)
                   FROM data_staging
                   LEFT JOIN data_type_mappings ON data_type_mappings.id = data_staging.mapping_id
                   WHERE data_staging.import_id = $1
                   AND data_staging.inserted_at IS NULL
                   AND data_type_mappings.active IS TRUE
                   AND EXISTS (SELECT * from data_type_mapping_transformations WHERE data_type_mapping_transformations.type_mapping_id = data_staging.mapping_id)
            `,
            values: [importID]
        }
    }

    private static setInsertedByImportStatement(importID: string): QueryConfig {
        return {
            text: `UPDATE data_staging SET inserted_At = NOW() WHERE import_id = $1`,
            values: [importID]
        }
    }

    private static setInsertedStatement(id: number): QueryConfig {
        return {
            text: `UPDATE data_staging SET inserted_At = NOW() WHERE id = $1`,
            values: [id]
        }
    }

    private static deleteStatement(id: string): QueryConfig {
        return {
            text:`DELETE FROM data_staging WHERE id = $1`,
            values: [id]
        }
    }

    private static setErrorsStatement(id: number, errors: string[]): QueryConfig {
        return {
            text: `UPDATE data_staging SET errors = $1 WHERE id = $2`,
            values: [errors, id]
        }
    }

    private static addErrorsStatement(id: number, error: string): QueryConfig {
        return {
            text: `UPDATE data_staging SET errors = array_append(errors, $1) WHERE id = $2`,
            values: [error, id]
        }
    }
}
