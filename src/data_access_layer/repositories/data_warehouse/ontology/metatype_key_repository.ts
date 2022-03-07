import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import MetatypeKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import Result from '../../../../common_classes/result';
import MetatypeKeyMapper from '../../../mappers/data_warehouse/ontology/metatype_key_mapper';
import {User} from '../../../../domain_objects/access_management/user';
import MetatypeRepository from './metatype_repository';
import {PoolClient} from 'pg';
import TypeTransformation from '../../../../domain_objects/data_warehouse/etl/type_transformation';

/*
 We have the bare minimum of functions in this repository, and it only exists
 for backwards compatibility. Key manipulation should be handled when dealing
 with the metatype itself directly. We also do not implement caching on the key
 layer due to this cache being out of date with the Metatype one
 */
export default class MetatypeKeyRepository extends Repository implements RepositoryInterface<MetatypeKey> {
    #mapper: MetatypeKeyMapper = MetatypeKeyMapper.Instance;
    #metatypeRepo: MetatypeRepository = new MetatypeRepository();

    delete(k: MetatypeKey): Promise<Result<boolean>> {
        if (k.id) {
            void this.#metatypeRepo.deleteCached(k.metatype_id!);
            return this.#mapper.Delete(k.id);
        }

        return Promise.resolve(Result.Failure(`key has no id`));
    }

    archive(user: User, k: MetatypeKey): Promise<Result<boolean>> {
        if (k.id) {
            void this.#metatypeRepo.deleteCached(k.metatype_id!);
            return this.#mapper.Archive(k.id, user.id!);
        }

        return Promise.resolve(Result.Failure(`key has no id`));
    }

    unarchive(user: User, k: MetatypeKey): Promise<Result<boolean>> {
        if (k.id) {
            void this.#metatypeRepo.deleteCached(k.metatype_id!);
            return this.#mapper.Unarchive(k.id, user.id!);
        }

        return Promise.resolve(Result.Failure(`key has no id`));
    }

    findByID(id: string): Promise<Result<MetatypeKey>> {
        return this.#mapper.Retrieve(id);
    }

    async save(m: MetatypeKey, user: User): Promise<Result<boolean>> {
        const errors = await m.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`key does not pass validation ${errors.join(',')}`));
        }

        // clear the parent metatype's cache
        void this.#metatypeRepo.deleteCached(m.metatype_id!);

        if (m.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(m.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, m);

            const updated = await this.#mapper.Update(user.id!, original.value);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            Object.assign(m, updated.value);
            return Promise.resolve(Result.Success(true));
        }

        const result = await this.#mapper.Create(user.id!, m);
        if (result.isError) return Promise.resolve(Result.Pass(result));

        Object.assign(m, result.value);
        return Promise.resolve(Result.Success(true));
    }

    async bulkSave(user: User, k: MetatypeKey[]): Promise<Result<boolean>> {
        const toCreate: MetatypeKey[] = [];
        const toUpdate: MetatypeKey[] = [];
        const toReturn: MetatypeKey[] = [];

        for (const key of k) {
            const errors = await key.validationErrors();
            if (errors) {
                return Promise.resolve(Result.Failure(`some keys do not pass validation ${errors.join(',')}`));
            }

            // clear the parent metatype's cache
            void this.#metatypeRepo.deleteCached(key.metatype_id!);
            key.id ? toUpdate.push(key) : toCreate.push(key);
        }

        // we run the bulk save in a transaction so that on failure we don't get
        // stuck with partially updated items
        const transaction = await this.#mapper.startTransaction();
        if (transaction.isError) return Promise.resolve(Result.Failure(`unable to initiate db transaction`));

        if (toUpdate.length > 0) {
            const results = await this.#mapper.BulkUpdate(user.id!, toUpdate, transaction.value);
            if (results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Pass(results));
            }

            toReturn.push(...results.value);
        }

        if (toCreate.length > 0) {
            const results = await this.#mapper.BulkCreate(user.id!, toCreate, transaction.value);
            if (results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Pass(results));
            }
            toReturn.push(...results.value);
        }

        const committed = await this.#mapper.completeTransaction(transaction.value);
        if (committed.isError) {
            void this.#mapper.rollbackTransaction(transaction.value);
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`));
        }

        toReturn.forEach((result, i) => {
            Object.assign(k[i], result);
        });

        return Promise.resolve(Result.Success(true));
    }

    constructor() {
        super(MetatypeKeyMapper.tableName);
    }

    id(operator: string, value: any) {
        super.query('id', operator, value);
        return this;
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<MetatypeKey[]>> {
        return super.findAll<MetatypeKey>(options, {
            transaction,
            resultClass: MetatypeKey,
        });
    }
}
