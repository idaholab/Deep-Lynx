import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import Result from '../../../../common_classes/result';
import Cache from '../../../../services/cache/cache';
import Config from '../../../../services/config';
import Logger from '../../../../services/logger';
import MetatypeRelationshipMapper from '../../../mappers/data_warehouse/ontology/metatype_relationship_mapper';
import {plainToClass, serialize} from 'class-transformer';
import MetatypeRelationshipKeyMapper from '../../../mappers/data_warehouse/ontology/metatype_relationship_key_mapper';
import MetatypeRelationshipKey from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_key';
import {PoolClient} from 'pg';
import {User} from '../../../../domain_objects/access_management/user';

/*
    MetatypeRelationshipRepository contains methods for persisting and retrieving a metatype relationship
    to storage. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning.
 */
export default class MetatypeRelationshipRepository extends Repository implements RepositoryInterface<MetatypeRelationship> {
    #mapper: MetatypeRelationshipMapper = MetatypeRelationshipMapper.Instance;
    #keyMapper: MetatypeRelationshipKeyMapper = MetatypeRelationshipKeyMapper.Instance;

    async save(m: MetatypeRelationship, user: User, saveKeys = true): Promise<Result<boolean>> {
        const errors = await m.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`metatype relationship does not pass validation ${errors.join(',')}`));
        }

        // we run the bulk save in a transaction so that on failure we don't get
        // stuck figuring out what metatypes' keys didn't update
        const transaction = await this.#mapper.startTransaction();
        if (transaction.isError) return Promise.resolve(Result.Failure(`unable to initiate db transaction`));

        // if we have a set id, attempt to update the metatype and then clear its cache
        if (m.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(m.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, m);

            void this.deleteCached(m.id);

            const result = await this.#mapper.Update(user.id!, original.value, transaction.value);
            if (result.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Pass(result));
            }

            Object.assign(m, result.value);
            // assign the new id to them all
            if (m.keys) m.keys.forEach((key) => (key.metatype_relationship_id = result.value.id));

            if (saveKeys) {
                const keys = await this.saveKeys(user, m, transaction.value);
                if (keys.isError) {
                    await this.#mapper.rollbackTransaction(transaction.value);
                    return Promise.resolve(Result.Failure(`unable to update metatype relationship's keys ${keys.error?.error}`));
                }
            }

            const committed = await this.#mapper.completeTransaction(transaction.value);
            if (committed.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`));
            }

            return Promise.resolve(Result.Success(true));
        }

        const result = await this.#mapper.Create(user.id!, m);
        if (result.isError) {
            await this.#mapper.rollbackTransaction(transaction.value);
            return Promise.resolve(Result.Pass(result));
        }

        Object.assign(m, result.value);
        // assign the new id to them all
        if (m.keys) m.keys.forEach((key) => (key.metatype_relationship_id = m.id));

        if (saveKeys) {
            const keys = await this.saveKeys(user, m, transaction.value);
            if (keys.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Failure(`updating metatype relationships keys failed: ${keys.error}`));
            }
        }

        const committed = await this.#mapper.completeTransaction(transaction.value);
        if (committed.isError) {
            await this.#mapper.rollbackTransaction(transaction.value);
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`));
        }

        return Promise.resolve(Result.Success(true));
    }

    async bulkSave(user: User, m: MetatypeRelationship[], saveKeys = true): Promise<Result<boolean>> {
        // separate metatypes by which need to be created and which need to updated
        const toCreate: MetatypeRelationship[] = [];
        const toUpdate: MetatypeRelationship[] = [];

        const toReturn: MetatypeRelationship[] = [];

        // run validation, separate, and clear cache for each metatype
        for (const metatype of m) {
            const errors = await metatype.validationErrors();
            if (errors) {
                return Promise.resolve(Result.Failure(`one or more metatype relationships do not pass validation ${errors.join(',')}`));
            }

            if (metatype.id) {
                toUpdate.push(metatype);
                void this.deleteCached(metatype.id);
            } else {
                toCreate.push(metatype);
            }
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

        toReturn.forEach((result, i) => {
            Object.assign(m[i], result);
        });

        // update the keys
        if (saveKeys) {
            for (const metatype of m) {
                const keys = await this.saveKeys(user, metatype, transaction.value);
                if (keys.isError) {
                    await this.#mapper.rollbackTransaction(transaction.value);
                    return Promise.resolve(Result.Failure(`updating metatype relationships keys failed: ${keys.error}`));
                }
            }
        }

        const committed = await this.#mapper.completeTransaction(transaction.value);
        if (committed.isError) {
            await this.#mapper.rollbackTransaction(transaction.value);
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`));
        }

        return Promise.resolve(Result.Success(true));
    }

    private async saveKeys(user: User, m: MetatypeRelationship, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction = false;
        const keysUpdate: MetatypeRelationshipKey[] = [];
        const keysCreate: MetatypeRelationshipKey[] = [];
        const returnKeys: MetatypeRelationshipKey[] = [];

        // we wrap this in a transaction so we don't get partially updated keys
        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate database transaction'));

            transaction = newTransaction.value;
            internalTransaction = true; // let the function know this is a generated transaction
        }

        if (m.removedKeys && m.removedKeys.length > 0) {
            const removedKeys = await this.#keyMapper.BulkDelete(m.removedKeys);
            if (removedKeys.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`unable to delete keys ${removedKeys.error?.error}`));
            }
        }

        if (m.keys && m.keys.length <= 0) {
            if (internalTransaction) {
                const commit = await this.#mapper.completeTransaction(transaction);
                if (commit.isError) return Promise.resolve(Result.Pass(commit));
            }

            return Promise.resolve(Result.Success(true));
        }

        if (m.keys)
            for (const key of m.keys) {
                // set key's metatype_id and container_id to equal its parent
                key.metatype_relationship_id = m.id;
                key.container_id = m.container_id;

                const errors = await key.validationErrors();
                if (errors) {
                    if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                    return Promise.resolve(Result.Failure(`one or more metatype relationship keys do not pass validation ${errors.join(',')}`));
                }

                key.id ? keysUpdate.push(key) : keysCreate.push(key);
            }

        if (keysUpdate.length > 0) {
            const results = await this.#keyMapper.BulkUpdate(user.id!, keysUpdate, transaction);
            if (results.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(results));
            }

            returnKeys.push(...results.value);
        }

        if (keysCreate.length > 0) {
            const results = await this.#keyMapper.BulkCreate(user.id!, keysCreate, transaction);
            if (results.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(results));
            }

            returnKeys.push(...results.value);
        }

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        m.replaceKeys(returnKeys);

        return Promise.resolve(Result.Success(true));
    }

    // bulkSave will always return  new instances of provided class to save, this is
    // done so that the user can have the updated ID and other information after
    // insert.

    async delete(m: MetatypeRelationship): Promise<Result<boolean>> {
        if (m.id) {
            void this.deleteCached(m.id);

            return this.#mapper.Delete(m.id);
        }

        return Promise.resolve(Result.Failure('metatype relationship has no id'));
    }

    archive(user: User, m: MetatypeRelationship): Promise<Result<boolean>> {
        if (m.id) {
            void this.deleteCached(m.id);

            return this.#mapper.Archive(m.id, user.id!);
        }

        return Promise.resolve(Result.Failure('metatype relationship has no id'));
    }

    async findByID(id: string, loadKeys = true): Promise<Result<MetatypeRelationship>> {
        const cached = await this.getCached(id);
        if (cached) {
            return Promise.resolve(Result.Success(cached));
        }

        const retrieved = await this.#mapper.Retrieve(id);

        // we do not want to store this in cache unless we do so with the full object
        if (!retrieved.isError && loadKeys) {
            const keys = await this.#keyMapper.ListForRelationship(retrieved.value.id!);
            if (!keys.isError) retrieved.value.addKey(...keys.value);

            // don't fail out on cache set failure, log and move on
            void this.setCache(retrieved.value);
        }

        return Promise.resolve(retrieved);
    }

    private async getCached(id: string): Promise<MetatypeRelationship | undefined> {
        const cached = await Cache.get<object>(`${MetatypeRelationshipMapper.tableName}:${id}`);
        if (cached) {
            const metatype = plainToClass(MetatypeRelationship, cached);
            return Promise.resolve(metatype);
        }

        return Promise.resolve(undefined);
    }

    private async setCache(m: MetatypeRelationship): Promise<boolean> {
        const set = await Cache.set(`${MetatypeRelationshipMapper.tableName}:${m.id}`, serialize(m), Config.cache_default_ttl);
        if (!set) Logger.error(`unable to set cache for metatype relationship ${m.id}`);

        return Promise.resolve(set);
    }

    async deleteCached(id: string): Promise<boolean> {
        const deleted = await Cache.del(`${MetatypeRelationshipMapper.tableName}:${id}`);
        if (!deleted) Logger.error(`unable to remove metatype relationship ${id} from cache`);

        return Promise.resolve(deleted);
    }

    constructor() {
        super(MetatypeRelationshipMapper.viewName);
    }

    // filter specific functions
    id(operator: string, value: any) {
        super.query('id', operator, value);
        return this;
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
        return this;
    }

    name(operator: string, value: any) {
        super.query('name', operator, value);
        return this;
    }

    description(operator: string, value: any) {
        super.query('description', operator, value);
        return this;
    }

    ontologyVersion(operator: string, value?: any) {
        super.query('ontology_version', operator, value);
        return this;
    }

    count(): Promise<Result<number>> {
        return super.count();
    }

    async list(loadKeys = true, options?: QueryOptions, transaction?: PoolClient): Promise<Result<MetatypeRelationship[]>> {
        const results = await super.findAll<MetatypeRelationship>(options, {
            transaction,
            resultClass: MetatypeRelationship,
        });
        if (results.isError) return Promise.resolve(Result.Pass(results));

        if (loadKeys) {
            await Promise.all(
                results.value.map(async (relationship) => {
                    const keys = await MetatypeRelationshipKeyMapper.Instance.ListForRelationship(relationship.id!);

                    return relationship.addKey(...keys.value);
                }),
            );
        }

        return Promise.resolve(Result.Success(results.value));
    }
}
