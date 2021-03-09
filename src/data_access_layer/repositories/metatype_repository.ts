import RepositoryInterface, {Repository} from "./repository_base";
import Metatype from "../../data_warehouse/ontology/metatype";
import Result from "../../result";
import {UserT} from "../../types/user_management/userT";
import Cache from "../../services/cache/cache";
import Config from "../../config";
import Logger from "../../logger";
import MetatypeMapper from "../mappers/metatype_mapper";
import {plainToClass, serialize} from "class-transformer";
import MetatypeKeyMapper from "../mappers/metatype_key_storage";
import MetatypeKey from "../../data_warehouse/ontology/metatype_key";
import {PoolClient} from "pg";

export default class MetatypeRepository extends Repository implements RepositoryInterface<Metatype> {
    #mapper: MetatypeMapper = MetatypeMapper.Instance
    #keyMapper: MetatypeKeyMapper = MetatypeKeyMapper.Instance

    // save will always return a new instance of provided class to save, this is
    // done so that the user can have the updated ID and other information after
    // insert. By default this will also save/update any attached keys to the object
    async save(user: UserT, m: Metatype, saveKeys?: boolean): Promise<Result<Metatype>> {
        // we run the bulk save in a transaction so that on failure we don't get
        // stuck figuring out what metatypes' keys didn't update
        const transaction = await this.#mapper.startTransaction()
        if(transaction.isError) return Promise.resolve(Result.Failure(`unable to initiate db transaction`))

        const errors = await m.validationErrors()
        if(errors) {
            return Promise.resolve(Result.Failure(`metatype does not pass validation ${errors.join(",")}`))
        }

        // if we have a set id, attempt to update the metatype and then clear its cache
        if(m.id) {
            const result = await this.#mapper.Update(user.id!, m, transaction.value)
            if(result.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Pass(result))
            }

            Cache.del(`${MetatypeMapper.tableName}:${result.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${result.value.id} from cache`)
                })

            // you must call the original object here as the returned value from
            // the mapper will not have any keys on it currently
            const keys = await this.saveKeys(user, m, transaction.value)
            if(keys.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Failure(`metatype saved successfully but updating its keys failed ${keys.error}`))
            }

            result.value.keys = keys.value
            return Promise.resolve(Result.Success(result.value))
        }

        const result = await this.#mapper.Create(user.id!, m)
        if(result.isError) {
            await this.#mapper.rollbackTransaction(transaction.value)
            return Promise.resolve(Result.Pass(result))
        }

        const keys = await this.saveKeys(user, m, transaction.value)
        if(keys.isError) {
            await this.#mapper.rollbackTransaction(transaction.value)
            return Promise.resolve(Result.Failure(`updating metatypes keys failed: ${keys.error}`))
        }

        const committed = await this.#mapper.completeTransaction(transaction.value)
        if(committed.isError) {
            this.#mapper.rollbackTransaction(transaction.value)
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`))
        }

        result.value.keys = keys.value
        return Promise.resolve(Result.Success(result.value))
    }

    // bulkSave will always return  new instances of provided class to save, this is
    // done so that the user can have the updated ID and other information after
    // insert.
    async bulkSave(user: UserT, m: Metatype[]): Promise<Result<Metatype[]>> {
        // separate metatypes by which need to be created and which need to updated
        const toCreate: Metatype[] = []
        const toUpdate: Metatype[] = []

        const toReturn: Metatype[] = []

        // run validation and separate
        for(const metatype of m) {
            const errors = await metatype.validationErrors()
            if(errors){
                return Promise.resolve(Result.Failure(`one or more metatypes do not pass validation ${errors.join(",")}`))
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

        // update the keys
        for(const metatype of toReturn) {
            const keys = await this.saveKeys(user, metatype, transaction.value)
            if(keys.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Failure(`updating metatypes keys failed: ${keys.error}`))
            }

            metatype.keys = keys.value
        }

        const committed = await this.#mapper.completeTransaction(transaction.value)
        if(committed.isError) {
            this.#mapper.rollbackTransaction(transaction.value)
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`))
        }

        return Promise.resolve(Result.Success(toReturn))
    }


    private async saveKeys(user: UserT, m: Metatype, transaction?: PoolClient): Promise<Result<MetatypeKey[]>> {
        const keysUpdate: MetatypeKey[] = []
        const keysCreate: MetatypeKey[] = []
        const returnKeys: MetatypeKey[] = []

        // we wrap this in a transaction so we don't get partially updated keys
        if(!transaction) {
            const newTransaction = await this.#mapper.startTransaction()
            if(newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate database transaction'))

            transaction = newTransaction.value
        }

        for(const key of m.keys) {
            const errors = await key.validationErrors();
            if(errors) {
                return Promise.resolve(Result.Failure(`one or more metatype keys do not pass validation ${errors.join(",")}`))
            }

            (key.id) ? keysUpdate.push(key) : keysCreate.push(key)
        }

        if(keysUpdate.length > 0) {
            const results = await this.#keyMapper.BulkUpdate(user.id!, keysUpdate, transaction)
            if(results.isError) {
                await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(results))
            }

            returnKeys.push(...results.value)
        }

        if(keysCreate.length > 0) {
            const results = await this.#keyMapper.BulkCreate(user.id!, keysUpdate, transaction)
            if(results.isError) {
                await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(results))
            }

            returnKeys.push(...results.value)
        }

        const commit = await this.#mapper.completeTransaction(transaction)
        if(commit.isError) return Promise.resolve(Result.Pass(commit))

        return Promise.resolve(Result.Success(returnKeys))
    }

    // bulkSave will always return  new instances of provided class to save, this is
    // done so that the user can have the updated ID and other information after
    // insert.

    delete(m: Metatype): Promise<Result<boolean>> {
        if(m.id) {
            return this.#mapper.PermanentlyDelete(m.id)
        }

        return Promise.resolve(Result.Failure('metatype has no id'))
    }

    archive(user: UserT, m: Metatype): Promise<Result<boolean>> {
        if (m.id) {
            return this.#mapper.Archive(m.id, user.id!)
        }

        return Promise.resolve(Result.Failure('metatype has no id'))
    }

    async findByID(id: string): Promise<Result<Metatype>> {
        const cached = await Cache.get<Metatype>(`${MetatypeMapper.tableName}:${id}`)
        if(cached) {
            return new Promise(resolve => resolve(Result.Success(plainToClass(Metatype,cached))))
        }

        const retrieved = await this.#mapper.Retrieve(id)

        if(!retrieved.isError) {
            // don't fail out on cache set failure, log and move on
            Cache.set(`${MetatypeMapper.tableName}:${id}`, serialize(retrieved.value), Config.cache_default_ttl)
                .then(set => {
                    if(!set) Logger.error(`unable to insert metatype ${id} into cache`)
                })
        }

        return Promise.resolve(retrieved)
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

    async list(limit?: number, offset?:number, sortBy?: string, sortDesc?: boolean): Promise<Result<Metatype[]>> {
        const results = await super.findAll<object>(limit, offset, sortBy, sortDesc)

        if(results.isError) return Promise.resolve(Result.Pass(results))

        const metatypes = plainToClass(Metatype, results.value)

        await Promise.all(metatypes.map(async (metatype) => {
            const keys = await MetatypeKeyMapper.Instance.List(metatype.id!)

            metatype.keys = plainToClass(MetatypeKey, keys.value)
        }))

        return Promise.resolve(Result.Success(metatypes))
    }

}
