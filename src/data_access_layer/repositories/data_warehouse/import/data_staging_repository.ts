import RepositoryInterface, {QueryOptions, Repository} from "../../repository";
import {DataStaging} from "../../../../data_warehouse/import/import";
import DataStagingMapper from "../../../mappers/data_warehouse/import/data_staging_mapper";
import Result from "../../../../common_classes/result";
import {PoolClient} from "pg";
import {User} from "../../../../access_management/user";

export default class DataStagingRepository extends Repository implements RepositoryInterface<DataStaging> {
    #mapper = DataStagingMapper.Instance

    delete(t: DataStaging): Promise<Result<boolean>> {
        if(t.id) {
            return this.#mapper.PermanentlyDelete(t.id)
        }

        return Promise.resolve(Result.Failure(`data record has no id`))
    }

    findByID(id: number, transaction?: PoolClient): Promise<Result<DataStaging>> {
        return this.#mapper.Retrieve(id, transaction)
    }

    async save(record: DataStaging, user?: User, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction: boolean = false
        const errors = await record.validationErrors()
        if(errors) return Promise.resolve(Result.Failure(`node does not pass validation ${errors.join(",")}`))

        if(!transaction) {
            const newTransaction = await this.#mapper.startTransaction()
            if(newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiated db transaction'))

            transaction = newTransaction.value
            internalTransaction = true
        }

        if(record.id) {
            const updated = await this.#mapper.Update(record, transaction)
            if(updated.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(updated))
            }

            Object.assign(record, updated.value)
        } else {
            const created = await this.#mapper.Create(record, transaction)
            if(created.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(created))
            }

            Object.assign(record, created.value)
        }

        if(internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction)
            if(commit.isError) return Promise.resolve(Result.Pass(commit))
        }

        return Promise.resolve(Result.Success(true))
    }

    async bulkSave(records: DataStaging[], transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction: boolean = false
        if(!transaction) {
            const newTransaction = await this.#mapper.startTransaction()
            if(newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiated db transaction'))

            transaction = newTransaction.value
            internalTransaction = true
        }

        const operations: Promise<Result<boolean>>[] = []
        const toCreate: DataStaging[] = []
        const toUpdate: DataStaging[] = []
        const toReturn: DataStaging[] = []

        for(const record of records) {
            operations.push(new Promise(resolve => {
                record.validationErrors()
                    .then((errors) => {
                        if(errors) {
                            resolve(Result.Failure(`data staging record fails validation ${errors.join(",")}`))
                            return
                        }

                        resolve(Result.Success(true))
                    })
                    .catch(e => resolve(Result.Failure(`data staging record fails validation ${e}`)))
            }));

            (record.id) ? toUpdate.push(record) : toCreate.push(record)
        }

        const completed = await Promise.all(operations)
        for(const complete of completed) {
            if(complete.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Failure(`one or more data staging records failed ${complete.error?.error}`))
            }
        }

        if(toUpdate.length > 0) {
            const saved = await this.#mapper.BulkUpdate(toUpdate, transaction)
            if(saved.isError){
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(saved))
            }

            toReturn.push(...saved.value)
        }

        if(toCreate.length > 0) {
            const saved = await this.#mapper.BulkCreate(toCreate, transaction)
            if(saved.isError){
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(saved))
            }

            toReturn.push(...saved.value)
        }

        toReturn.forEach((result, i) => {
            Object.assign(records[i], result)
        })

        if(internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction)
            if(commit.isError) return Promise.resolve(Result.Pass(commit))
        }

        return Promise.resolve(Result.Success(true))
    }

    setInserted(t: DataStaging, transaction?: PoolClient): Promise<Result<boolean>> {
        if(t.id) {
            return this.#mapper.SetInserted(t.id, transaction)
        }

        return Promise.resolve(Result.Failure(`data record must have id`))
    }

    // completely override the error set
    setErrors(id: number, errors: string[], transaction?: PoolClient): Promise<Result<boolean>> {
        return this.#mapper.SetErrors(id, errors, transaction)
    }

    // add an error to an existing error set
    addError(id: number, errors: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return this.#mapper.AddError(id, errors, transaction)
    }

    constructor() {
        super(DataStagingMapper.tableName);
    }

    dataSourceID(operator: string, value: any) {
        super.query("data_source_id", operator, value)
        return this
    }

    importID(operator: string, value: any) {
        super.query("import_id", operator, value)
        return this
    }

    status(operator:string, value:  "ready" | "processing" | "error" | "stopped" | "completed") {
        super.query("status", operator, value)
        return this
    }

    listUninsertedActiveMapping(importID: string, offset:number, limit: number, transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        return this.#mapper.ListUninsertedActiveMapping(importID, offset, limit, transaction)
    }

    async count(transaction?: PoolClient): Promise<Result<number>> {
        return super.count(transaction)
    }

    countUninsertedForImport(importID:string, transaction?: PoolClient): Promise<Result<number>> {
        return this.#mapper.CountUninsertedForImport(importID, transaction)
    }

    countUninsertedActiveMappingForImport(importID:string, transaction?: PoolClient): Promise<Result<number>> {
        return this.#mapper.CountUninsertedActiveMapping(importID, transaction)
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        return super.findAll<DataStaging>(options, {transaction, resultClass: DataStaging})
    }

}
