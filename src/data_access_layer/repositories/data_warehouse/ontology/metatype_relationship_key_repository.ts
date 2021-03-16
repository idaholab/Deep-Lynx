import RepositoryInterface, {Repository} from "../../repository";
import MetatypeRelationshipKey from "../../../../data_warehouse/ontology/metatype_relationship_key";
import Result from "../../../../result";
import MetatypeRelationshipKeyMapper from "../../../mappers/data_warehouse/ontology/metatype_relationship_key_mapper";
import {User} from "../../../../access_management/user";

// we have the bare minimum of functions in this repository, and it only exists
// for backwards compatibility. Key manipulation should be handled when dealing
// with the metatype itself directly. We also do not implement caching on the key
// layer due to this cache being out of date with the Metatype Relationship one
export default class MetatypeRelationshipKeyRepository extends  Repository implements RepositoryInterface<MetatypeRelationshipKey> {
    #mapper : MetatypeRelationshipKeyMapper = MetatypeRelationshipKeyMapper.Instance

    delete(k: MetatypeRelationshipKey): Promise<Result<boolean>> {
        if(k.id) {
            return this.#mapper.PermanentlyDelete(k.id)
        }

        return Promise.resolve(Result.Failure(`key has no id`));
    }

    archive(user: User, k: MetatypeRelationshipKey): Promise<Result<boolean>> {
        if(k.id) {
            return this.#mapper.Archive(k.id, user.id!)
        }

        return Promise.resolve(Result.Failure(`key has no id`));
    }

    findByID(id: string): Promise<Result<MetatypeRelationshipKey>> {
        return this.#mapper.Retrieve(id)
    }

    async save(user: User, k: MetatypeRelationshipKey): Promise<Result<boolean>> {
        const errors = await k.validationErrors()
        if(errors) {
            return Promise.resolve(Result.Failure(`key does not pass validation ${errors.join(",")}`))
        }

        if(k.id) {
            const updated = await this.#mapper.Update(user.id!, k)
            if(updated.isError) return Promise.resolve(Result.Pass(updated))

            Object.assign(k, updated.value)
            return Promise.resolve(Result.Success(true))
        }

        const result = await this.#mapper.Create(user.id!, k)
        if(result.isError) return Promise.resolve(Result.Pass(result))

        Object.assign(k, result.value)
        return Promise.resolve(Result.Success(true))
    }

    async bulkSave(user: User, k: MetatypeRelationshipKey[]): Promise<Result<boolean>> {
        const toCreate: MetatypeRelationshipKey[] = []
        const toUpdate: MetatypeRelationshipKey[] = []
        const toReturn: MetatypeRelationshipKey[] = []

        for(const key of k) {
            const errors = await key.validationErrors()
            if(errors) {
                return Promise.resolve(Result.Failure(`some keys do not pass validation ${errors.join(',')}`))
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
            if (results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Pass(results))
            }
            toReturn.push(...results.value)
        }

        const committed = await this.#mapper.completeTransaction(transaction.value)
        if(committed.isError) {
            this.#mapper.rollbackTransaction(transaction.value)
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`))
        }

        toReturn.forEach((result, i) => {
            Object.assign(k[i], result)
        })

        return Promise.resolve(Result.Success(true))
    }

    constructor() {
        super(MetatypeRelationshipKeyMapper.tableName);
    }
}
