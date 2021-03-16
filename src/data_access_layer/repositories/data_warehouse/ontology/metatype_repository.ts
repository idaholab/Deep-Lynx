import RepositoryInterface, {QueryOptions, Repository} from "../../repository";
import Metatype from "../../../../data_warehouse/ontology/metatype";
import Result from "../../../../result";
import Cache from "../../../../services/cache/cache";
import Config from "../../../../services/config";
import Logger from "../../../../services/logger";
import MetatypeMapper from "../../../mappers/data_warehouse/ontology/metatype_mapper";
import {plainToClass, serialize} from "class-transformer";
import MetatypeKeyMapper from "../../../mappers/data_warehouse/ontology/metatype_key_mapper";
import MetatypeKey from "../../../../data_warehouse/ontology/metatype_key";
import {PoolClient} from "pg";
import {User} from "../../../../access_management/user";

export default class MetatypeRepository extends Repository implements RepositoryInterface<Metatype> {
    #mapper: MetatypeMapper = MetatypeMapper.Instance
    #keyMapper: MetatypeKeyMapper = MetatypeKeyMapper.Instance

    async save(user: User, m: Metatype, saveKeys: boolean = true): Promise<Result<boolean>> {
        const errors = await m.validationErrors()
        if(errors) {
            return Promise.resolve(Result.Failure(`metatype does not pass validation ${errors.join(",")}`))
        }

        // we run the save in a transaction so that on failure we don't get
        // stuck figuring out what metatypes' keys didn't update
        const transaction = await this.#mapper.startTransaction()
        if(transaction.isError) return Promise.resolve(Result.Failure(`unable to initiate db transaction`))

        // if we have a set id, attempt to update the metatype and then clear its cache
        if(m.id) {
            this.deleteCached(m.id)

            const result = await this.#mapper.Update(user.id!, m, transaction.value)
            if(result.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Pass(result))
            }

            Object.assign(m, result.value)

            // assign the new id to them all
            if(m.keys) m.keys.forEach(key => key.metatype_id = m.id)

            if(saveKeys) {
                const keys = await this.saveKeys(user, m, transaction.value)
                if(keys.isError) {
                    await this.#mapper.rollbackTransaction(transaction.value)
                    return Promise.resolve(Result.Failure(`unable to update metatype's keys ${keys.error?.error}`))
                }
            }

            const committed = await this.#mapper.completeTransaction(transaction.value)
            if(committed.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`))
            }

            return Promise.resolve(Result.Success(true))
        }

        const result = await this.#mapper.Create(user.id!, m)
        if(result.isError) {
            await this.#mapper.rollbackTransaction(transaction.value)
            return Promise.resolve(Result.Pass(result))
        }

        Object.assign(m, result.value)
        // assign the new id to the keys
        if(m.keys) m.keys.forEach(key => key.metatype_id = m.id)

        if(saveKeys) {
            const keys = await this.saveKeys(user, m, transaction.value)
            if(keys.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Failure(`updating metatypes keys failed: ${keys.error}`))
            }
        }

        const committed = await this.#mapper.completeTransaction(transaction.value)
        if(committed.isError) {
            await this.#mapper.rollbackTransaction(transaction.value)
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`))
        }

        return Promise.resolve(Result.Success(true))
    }

    async bulkSave(user: User, m: Metatype[], saveKeys: boolean = true): Promise<Result<boolean>> {
        // separate metatypes by which need to be created and which need to updated
        const toCreate: Metatype[] = []
        const toUpdate: Metatype[] = []
        const toReturn: Metatype[] = []

        // run validation, separate, and clear cache for each metatype
        for(const metatype of m) {
            const errors = await metatype.validationErrors()
            if(errors){
                return Promise.resolve(Result.Failure(`one or more metatypes do not pass validation ${errors.join(",")}`))
            }

            if(metatype.id) {
                toUpdate.push(metatype)
                this.deleteCached(metatype.id)
            } else {
                toCreate.push(metatype)
            }
        }

        // we run the bulk save in a transaction so that on failure we don't get
        // stuck with partially updated items
        const transaction = await this.#mapper.startTransaction()
        if(transaction.isError) return Promise.resolve(Result.Failure(`unable to initiate db transaction`))

        if(toUpdate.length > 0) {
            const results = await this.#mapper.BulkUpdate(user.id!, toUpdate, transaction.value)
            if(results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Pass(results))
            }

            toReturn.push(...results.value)
        }

        if(toCreate.length > 0) {
            const results = await this.#mapper.BulkCreate(user.id!, toCreate, transaction.value)
            if(results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Pass(results))
            }

            toReturn.push(...results.value)
        }

        toReturn.forEach((result, i) => {
            Object.assign(m[i], result)
        })

        // update the keys
        if(saveKeys) {
            for(const metatype of m) {
                const keys = await this.saveKeys(user, metatype, transaction.value)
                if(keys.isError) {
                    await this.#mapper.rollbackTransaction(transaction.value)
                    return Promise.resolve(Result.Failure(`updating metatypes keys failed: ${keys.error}`))
                }
            }
        }

        const committed = await this.#mapper.completeTransaction(transaction.value)
        if(committed.isError) {
            await this.#mapper.rollbackTransaction(transaction.value)
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`))
        }

        return Promise.resolve(Result.Success(true))
    }

    private async saveKeys(user: User, m: Metatype, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction: boolean = false
        const keysUpdate: MetatypeKey[] = []
        const keysCreate: MetatypeKey[] = []
        const returnKeys: MetatypeKey[] = []

        // we wrap this in a transaction so we don't get partially updated keys
        if(!transaction) {
            const newTransaction = await this.#mapper.startTransaction()
            if(newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate database transaction'))

            transaction = newTransaction.value
            internalTransaction = true // let the function know this is a generated transaction
        }

        if(m.removedKeys && m.removedKeys.length > 0) {
            const removedKeys = await this.#keyMapper.BulkDelete(m.removedKeys)
            if(removedKeys.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Failure(`unable to delete keys ${removedKeys.error?.error}`))
            }
        }

        if(m.keys && m.keys.length <= 0) {
            if(internalTransaction) {
                const commit = await this.#mapper.completeTransaction(transaction)
                if(commit.isError) return Promise.resolve(Result.Pass(commit))
            }

            return Promise.resolve(Result.Success(true))
        }

        if(m.keys) for(const key of m.keys) {
            // set key's metatype_id to equal its parent
            key.metatype_id = m.id;

            const errors = await key.validationErrors();
            if(errors) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Failure(`one or more metatype keys do not pass validation ${errors.join(",")}`))
            }

            (key.id) ? keysUpdate.push(key) : keysCreate.push(key)
        }

        if(keysUpdate.length > 0) {
            const results = await this.#keyMapper.BulkUpdate(user.id!, keysUpdate, transaction)
            if(results.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(results))
            }

            returnKeys.push(...results.value)
        }

        if(keysCreate.length > 0) {
            const results = await this.#keyMapper.BulkCreate(user.id!, keysCreate, transaction)
            if(results.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(results))
            }

            returnKeys.push(...results.value)
        }

        if(internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction)
            if(commit.isError) return Promise.resolve(Result.Pass(commit))
        }

        m.replaceKeys(returnKeys)

        return Promise.resolve(Result.Success(true))
    }

    // bulkSave will always return  new instances of provided class to save, this is
    // done so that the user can have the updated ID and other information after
    // insert.

    async delete(m: Metatype): Promise<Result<boolean>> {
        if(m.id) {
            this.deleteCached(m.id)

            return this.#mapper.PermanentlyDelete(m.id)
        }

        return Promise.resolve(Result.Failure('metatype has no id'))
    }

    archive(user: User, m: Metatype): Promise<Result<boolean>> {
        if (m.id) {
            this.deleteCached(m.id)

            return this.#mapper.Archive(m.id, user.id!)
        }

        return Promise.resolve(Result.Failure('metatype has no id'))
    }

    async findByID(id: string, loadKeys:boolean = true): Promise<Result<Metatype>> {
        const cached = await this.getCached(id)
        if(cached) {
            return Promise.resolve(Result.Success(cached))
        }

        const retrieved = await this.#mapper.Retrieve(id)

        if(!retrieved.isError) {
            if(loadKeys) {
                const keys = await this.#keyMapper.ListForMetatype(retrieved.value.id!)
                if(!keys.isError) retrieved.value.addKey(...keys.value)
            }

            // don't fail out on cache set failure, log and move on
            this.setCache(retrieved.value)
        }

        return Promise.resolve(retrieved)
    }

    private async getCached(id: string): Promise<Metatype | undefined> {
        const cached = await Cache.get<object>(`${MetatypeMapper.tableName}:${id}`)
        if(cached) {
            const metatype = plainToClass(Metatype, cached)
            return Promise.resolve(metatype)
        }

        return Promise.resolve(undefined)
    }

    private async setCache(m: Metatype): Promise<boolean> {
       const set = await Cache.set(`${MetatypeMapper.tableName}:${m.id}`, serialize(m), Config.cache_default_ttl)
       if(!set) Logger.error(`unable to set cache for metatype ${m.id}`)

       return Promise.resolve(set)
    }

    private async deleteCached(id: string): Promise<boolean> {
        const deleted = await Cache.del(`${MetatypeMapper.tableName}:${id}`)
        if(!deleted) Logger.error(`unable to remove metatype ${id} from cache`)

        return Promise.resolve(deleted)
    }

    constructor() {
        super(MetatypeMapper.tableName);
    }

    // filter specific functions
    id(operator: string, value: any) {
        super.query("id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("container_id", operator, value)
        return this
    }

    name(operator: string, value: any) {
        super.query("name", operator, value)
        return this
    }

    description(operator: string, value: any) {
        super.query("description", operator, value)
        return this
    }

    archived(operator: string, value: any) {
        super.query("archived", operator, value)
        return this
    }

    count(): Promise<Result<number>> {
        return super.count()
    }

    async list(loadKeys: boolean = true, options?: QueryOptions): Promise<Result<Metatype[]>> {
        const results = await super.findAll<object>(options)

        if(results.isError) return Promise.resolve(Result.Pass(results))

        const metatypes = plainToClass(Metatype, results.value)

        if(loadKeys) {
            await Promise.all(metatypes.map(async (metatype) => {
                const keys = await this.#keyMapper.ListForMetatype(metatype.id!)

                return metatype.addKey(...keys.value)
            }))
        }

        return Promise.resolve(Result.Success(metatypes))
    }
}
