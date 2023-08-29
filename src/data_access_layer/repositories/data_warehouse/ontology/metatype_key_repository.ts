import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import MetatypeKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import Result from '../../../../common_classes/result';
import MetatypeKeyMapper from '../../../mappers/data_warehouse/ontology/metatype_key_mapper';
import {User} from '../../../../domain_objects/access_management/user';
import MetatypeRepository from './metatype_repository';
import {PoolClient} from 'pg';
import Cache from '../../../../services/cache/cache';
import Logger from '../../../../services/logger';
import Config from '../../../../services/config';
import MetatypeMapper from '../../../mappers/data_warehouse/ontology/metatype_mapper';
import {plainToClass, serialize} from 'class-transformer';
import GraphQLRunner from '../../../../graphql/schema';

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
            void this.deleteCached(k.id, k.metatype_id!);
            void this.#metatypeRepo.deleteCached(k.metatype_id!);
            return this.#mapper.Delete(k.id);
        }

        return Promise.resolve(Result.Failure(`key has no id`));
    }

    archive(user: User, k: MetatypeKey): Promise<Result<boolean>> {
        if (k.id) {
            void this.deleteCached(k.id, k.metatype_id!);
            void this.#metatypeRepo.deleteCached(k.metatype_id!);
            return this.#mapper.Archive(k.id, user.id!);
        }

        return Promise.resolve(Result.Failure(`key has no id`));
    }

    unarchive(user: User, k: MetatypeKey): Promise<Result<boolean>> {
        if (k.id) {
            void this.deleteCached(k.id, k.metatype_id!);
            void this.#metatypeRepo.deleteCached(k.metatype_id!);
            return this.#mapper.Unarchive(k.id, user.id!);
        }

        return Promise.resolve(Result.Failure(`key has no id`));
    }

    async findByID(id: string, metatypeID?: string): Promise<Result<MetatypeKey>> {
        const cached = await this.getCached(id, metatypeID!);
        if (cached) {
            return Promise.resolve(Result.Success(cached));
        }

        let retrieved;
        if (metatypeID) {
            retrieved = await this.#mapper.RetrieveFromView(id, metatypeID);
        } else {
            retrieved = await this.#mapper.Retrieve(id);
        }

        // don't fail out on cache set failure, it will log and move on
        void this.setCache(retrieved.value);

        return Promise.resolve(retrieved);
    }

    async save(m: MetatypeKey, user: User): Promise<Result<boolean>> {
        const errors = await m.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`key does not pass validation ${errors.join(',')}`));
        }

        // clear the parent metatype's cache
        void this.#metatypeRepo.deleteCached(m.metatype_id!);
        void this.deleteCachedForMetatype(m.metatype_id!);

        if (m.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(m.id, m.metatype_id);
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
            void this.deleteCachedForMetatype(key.metatype_id!);
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

    async listForMetatype(metatypeID: string, containerID: string, fromView?: boolean): Promise<Result<MetatypeKey[]>> {
        const cached = await this.getCachedForMetatype(metatypeID);
        if (cached) {
            return Promise.resolve(Result.Success(cached));
        }

        // we don't cache from the materialized view
        if (fromView) return this.#mapper.ListFromViewForMetatype(metatypeID);

        const keys = await this.#mapper.ListForMetatype(metatypeID, containerID);
        if (keys.isError) return Promise.resolve(Result.Pass(keys));

        void (await this.setCachedForMetatype(metatypeID, keys.value));

        return Promise.resolve(keys);
    }

    async listForMetatypeIDs(metatype_ids: string[], fromView?: boolean): Promise<Result<MetatypeKey[]>> {
        if (fromView) return this.#mapper.ListFromViewForMetatypeIDs(metatype_ids);
        return this.#mapper.ListForMetatypeIDs(metatype_ids);
    }

    async deleteCachedForMetatype(metatypeID: string): Promise<boolean> {
        const deleted = await Cache.del(`${MetatypeMapper.tableName}:${metatypeID}:keys`);
        if (!deleted) Logger.error(`unable to remove metatype ${metatypeID}'s keys from cache`);

        const flushed = await Cache.flushByPattern(`${MetatypeMapper.tableName}:${metatypeID}:keys:*`);
        if (!flushed) Logger.error(`unable to remove metatype ${metatypeID}'s keys by pattern from cache`);

        return Promise.resolve(deleted);
    }

    async setCachedForMetatype(metatypeID: string, keys: MetatypeKey[]): Promise<boolean> {
        const set = await Cache.set(`${MetatypeMapper.tableName}:${metatypeID}:keys`, serialize(keys), Config.cache_default_ttl);
        if (!set) Logger.error(`unable to set cache for metatype ${metatypeID}'s keys`);

        return Promise.resolve(set);
    }

    async getCachedForMetatype(metatypeID: string): Promise<MetatypeKey[] | undefined> {
        const cached = await Cache.get<object[]>(`${MetatypeMapper.tableName}:${metatypeID}:keys`);
        if (cached) {
            const keys = plainToClass(MetatypeKey, cached);
            return Promise.resolve(keys);
        }

        return Promise.resolve(undefined);
    }

    async saveFromJSON(metatypeKeys: MetatypeKey[]): Promise<Result<boolean>> {
        return await this.#mapper.JSONCreate(metatypeKeys);
    }

    private async setCache(k: MetatypeKey): Promise<boolean> {
        const set = await Cache.set(`metatypes:${k.metatype_id}:keys:${k.id}`, serialize(k), Config.cache_default_ttl);
        if (!set) Logger.error(`unable to set cache for metatype key ${k.id}`);

        return Promise.resolve(set);
    }

    private async deleteCached(id: string, metatypeID: string): Promise<boolean> {
        const deleted = await Cache.del(`metatypes:${metatypeID}:keys:${id}`);
        if (!deleted) Logger.error(`unable to remove metatype key ${id} from cache`);

        return Promise.resolve(deleted);
    }

    private async getCached(id: string, metatypeID: string): Promise<MetatypeKey | undefined> {
        const cached = await Cache.get<object>(`metatypes:${metatypeID}:keys:${id}`);
        if (cached) {
            const metatypeKey = plainToClass(MetatypeKey, cached);
            return Promise.resolve(metatypeKey);
        }

        return Promise.resolve(undefined);
    }

    RefreshView(): Promise<Result<boolean>> {
        return this.#mapper.RefreshView();
    }

    // this function is to be used only on container import. it does not refresh the keys view.
    async importBulkSave(user: User, k: MetatypeKey[]): Promise<Result<boolean>> {
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
            void this.deleteCachedForMetatype(key.metatype_id!);
            key.id ? toUpdate.push(key) : toCreate.push(key);
        }

        // we run the bulk save in a transaction so that on failure we don't get
        // stuck with partially updated items
        const transaction = await this.#mapper.startTransaction();
        if (transaction.isError) return Promise.resolve(Result.Failure(`unable to initiate db transaction`));

        if (toUpdate.length > 0) {
            const results = await this.#mapper.ImportBulkUpdate(user.id!, toUpdate, transaction.value);
            if (results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Pass(results));
            }

            toReturn.push(...results.value);
        }

        if (toCreate.length > 0) {
            const results = await this.#mapper.ImportBulkCreate(user.id!, toCreate, transaction.value);
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

    uuid(operator: string, value: any) {
        super.query('uuid', operator, value);
        return this;
    }

    metatype_id(operator: string, value: any) {
        super.query('metatype_id', operator, value);
        return this;
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<MetatypeKey[]>> {
        return super.findAll<MetatypeKey>(options, {
            transaction,
            resultClass: MetatypeKey,
        });
    }
}
