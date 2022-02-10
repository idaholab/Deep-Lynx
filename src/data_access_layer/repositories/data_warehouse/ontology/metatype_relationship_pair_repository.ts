import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import Result from '../../../../common_classes/result';
import Cache from '../../../../services/cache/cache';
import {plainToClass, serialize} from 'class-transformer';
import Config from '../../../../services/config';
import Logger from '../../../../services/logger';
import MetatypeRelationshipPair from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeRelationshipPairMapper from '../../../mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import MetatypeRepository from './metatype_repository';
import MetatypeRelationshipRepository from './metatype_relationship_repository';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import {User} from '../../../../domain_objects/access_management/user';
import {PoolClient} from 'pg';

/*
    MetatypeRelationshipPair contains methods for persisting and retrieving a metatype relationship pair
    to storage. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning.
 */
export default class MetatypeRelationshipPairRepository extends Repository implements RepositoryInterface<MetatypeRelationshipPair> {
    #mapper: MetatypeRelationshipPairMapper = MetatypeRelationshipPairMapper.Instance;

    async delete(p: MetatypeRelationshipPair): Promise<Result<boolean>> {
        if (p.id) {
            void this.deleteCached(p.id);

            return this.#mapper.Delete(p.id);
        }

        return Promise.resolve(Result.Failure('metatype relationship pair has no id'));
    }

    archive(user: User, p: MetatypeRelationshipPair): Promise<Result<boolean>> {
        if (p.id) {
            void this.deleteCached(p.id);

            return this.#mapper.Archive(p.id, user.id!);
        }

        return Promise.resolve(Result.Failure('metatype relationship pair has no id'));
    }

    async findByID(id: string, loadRelationships = true): Promise<Result<MetatypeRelationshipPair>> {
        const cached = await this.getCached(id);
        if (cached) {
            // log on relationship load, but don't fail
            const loaded = await this.loadRelationships(cached);
            if (loaded.isError) Logger.error(loaded.error?.error!);

            return Promise.resolve(Result.Success(cached));
        }

        const retrieved = await this.#mapper.Retrieve(id);

        if (!retrieved.isError && loadRelationships) {
            // log on relationship load, but don't fail
            const loaded = await this.loadRelationships(retrieved.value);
            if (loaded.isError) Logger.error(loaded.error?.error!);

            void this.setCache(retrieved.value);
        }

        return Promise.resolve(retrieved);
    }

    // save will not save the origin/destination metatypes or metatype relationship unless the
    // user specifies. This is because we might be working with this object with a bare
    // minimum of info about those types
    async save(p: MetatypeRelationshipPair, user: User, saveRelationships?: boolean): Promise<Result<boolean>> {
        // attempt to save the relationships first, if required - keep in mind that
        // we can't wrap these in transactions so it is possible that you update one
        // but not another of the relationships. This is why the saveRelationships is
        // turned off by default.
        if (saveRelationships) {
            const metatypeRepo = new MetatypeRepository();
            const relationshipRepo = new MetatypeRelationshipRepository();

            const results = await Promise.all([
                metatypeRepo.save(p.originMetatype!, user),
                metatypeRepo.save(p.destinationMetatype!, user),
                relationshipRepo.save(p.relationship!, user),
            ]);

            const errors: string[] = [];

            results.forEach((result) => {
                if (result.isError) {
                    errors.push(result.error?.error!);
                    return;
                }
            });

            if (errors.length > 0) return Promise.resolve(Result.Failure(`one or more relationships failed to save: ${errors.join(',')}`));
        }

        // we run validation after relationship save in case the user included
        // metatypes/relationships to be created as part of the main class
        const errors = await p.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`metatype relationship pair does not pass validation ${errors.join}`));
        }

        // update if ID has already been set
        if (p.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(p.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, p);

            void this.deleteCached(p.id);
            const updated = await this.#mapper.Update(user.id!, original.value);
            if (updated.isError) return Promise.resolve(Result.Failure(`failed to update metatype relationship pair ${updated.error?.error}`));

            Object.assign(p, updated.value);
        } else {
            const created = await this.#mapper.Create(user.id!, p);
            if (created.isError) return Promise.resolve(Result.Failure(`failed to create metatype relationship pair ${created.error?.error}`));

            Object.assign(p, created.value);
        }

        // we want to insure we always have the latest relationship values
        const loaded = await this.loadRelationships(p);
        if (loaded.isError) Logger.error(loaded.error?.error!);

        return Promise.resolve(Result.Success(true));
    }

    async bulkSave(user: User, p: MetatypeRelationshipPair[], saveRelationships?: boolean): Promise<Result<boolean>> {
        // attempt to save the relationships first, if required - keep in mind that
        // we can't wrap these in transactions so it is possible that you update one
        // but not another of the relationships. This is why the saveRelationships is
        // turned off by default.
        if (saveRelationships) {
            const operations: Promise<Result<boolean>>[] = [];
            const errors: string[] = [];

            p.map((pair) => {
                const metatypeRepo = new MetatypeRepository();
                const relationshipRepo = new MetatypeRelationshipRepository();

                operations.push(
                    ...[
                        metatypeRepo.save(pair.originMetatype!, user),
                        metatypeRepo.save(pair.destinationMetatype!, user),
                        relationshipRepo.save(pair.relationship!, user),
                    ],
                );
            });

            const results = await Promise.all(operations);
            results.forEach((result) => {
                if (result.isError) errors.push(result.error!.error);
            });

            if (errors.length > 0) return Promise.resolve(Result.Failure(`one or more relationships failed to save: ${errors.join(',')}`));
        }

        const toCreate: MetatypeRelationshipPair[] = [];
        const toUpdate: MetatypeRelationshipPair[] = [];
        const toReturn: MetatypeRelationshipPair[] = [];

        for (const pair of p) {
            const errors = await pair.validationErrors();
            if (errors) {
                return Promise.resolve(Result.Failure(`one or more metatype relationship pairs do not pass validation ${errors.join(',')}`));
            }

            if (pair.id) {
                toUpdate.push(pair);
                void this.deleteCached(pair.id);
            } else {
                toCreate.push(pair);
            }
        }

        // we run the bulk save in a transaction so that on failure we don't get
        // stuck with partially updated items - keep in mind this does not apply
        // to the relationships that might have been saved before this operation
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
            Object.assign(p[i], result);
        });

        const committed = await this.#mapper.completeTransaction(transaction.value);
        if (committed.isError) {
            await this.#mapper.rollbackTransaction(transaction.value);
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`));
        }

        await Promise.all(
            p.map((pair) => {
                return this.loadRelationships(pair);
            }),
        );

        return Promise.resolve(Result.Success(true));
    }

    // attempt to fully load the relationships for the given relationships, we
    // don't trust the cached versions of the relationships as they could have changed
    private async loadRelationships(pair: MetatypeRelationshipPair): Promise<Result<boolean>> {
        const metatypeRepo = new MetatypeRepository();
        const relationshipRepo = new MetatypeRelationshipRepository();

        const results = await Promise.all([
            metatypeRepo.findByID(pair.originMetatype!.id!),
            metatypeRepo.findByID(pair.destinationMetatype!.id!),
            relationshipRepo.findByID(pair.relationship!.id!),
        ]);

        const errors: string[] = [];

        results.forEach((result) => {
            if (result.isError) {
                errors.push(result.error?.error!);
                return;
            }

            if (result.value instanceof Metatype) {
                // if it's not the origin we can safely assume it's the destination
                result.value.id === pair.originMetatype!.id ? (pair.originMetatype = result.value) : (pair.destinationMetatype = result.value);
            }

            if (result.value instanceof MetatypeRelationship) {
                pair.relationship = result.value;
            }
        });

        return errors.length > 0
            ? Promise.resolve(Result.Failure(`unable to load one or more relationships ${errors.join(',')}`))
            : Promise.resolve(Result.Success(true));
    }

    private async getCached(id: string): Promise<MetatypeRelationshipPair | undefined> {
        const cached = await Cache.get<object>(`${MetatypeRelationshipPairMapper.tableName}:${id}`);
        if (cached) {
            const pair = plainToClass(MetatypeRelationshipPair, cached);
            return Promise.resolve(pair);
        }

        return Promise.resolve(undefined);
    }

    private async setCache(p: MetatypeRelationshipPair): Promise<boolean> {
        const set = await Cache.set(`${MetatypeRelationshipPairMapper.tableName}:${p.id}`, serialize(p), Config.cache_default_ttl);
        if (!set) Logger.error(`unable to set cache for metatype relationship pair ${p.id}`);

        return Promise.resolve(set);
    }

    private async deleteCached(id: string): Promise<boolean> {
        const deleted = await Cache.del(`${MetatypeRelationshipPairMapper.tableName}:${id}`);
        if (!deleted) Logger.error(`unable to remove metatype relationship pair ${id} from cache`);

        return Promise.resolve(deleted);
    }

    constructor() {
        super(MetatypeRelationshipPairMapper.tableName);
        // in order to select the composite fields we must redo the initial query
        // to accept LEFT JOINs
        this._rawQuery = [
            `SELECT metatype_relationship_pairs.*, origin.name as origin_metatype_name , 
                    destination.name AS destination_metatype_name, 
                    relationships.name AS relationship_pair_name 
                FROM ${MetatypeRelationshipPairMapper.tableName}`,
            `LEFT JOIN metatypes origin ON metatype_relationship_pairs.origin_metatype_id = origin.id`,
            `LEFT JOIN metatypes destination ON metatype_relationship_pairs.destination_metatype_id = destination.id`,
            `LEFT JOIN metatype_relationships relationships ON metatype_relationship_pairs.relationship_id = relationships.id`,
        ];
    }

    id(operator: string, value: any) {
        super.query('metatype_relationship_pairs.id', operator, value);
        return this;
    }

    containerID(operator: string, value: any) {
        super.query('metatype_relationship_pairs.container_id', operator, value);
        return this;
    }

    name(operator: string, value: any) {
        super.query('metatype_relationship_pairs.name', operator, value);
        return this;
    }

    description(operator: string, value: any) {
        super.query('metatype_relationship_pairs.description', operator, value);
        return this;
    }

    // metatypeID will search relationships by both origin and destination
    metatypeID(operator: string, value: any) {
        return this.origin_metatype_id(operator, value).or().destination_metatype_id(operator, value);
    }

    origin_metatype_id(operator: string, value: any) {
        super.query('metatype_relationship_pairs.origin_metatype_id', operator, value);
        return this;
    }

    destination_metatype_id(operator: string, value: any) {
        super.query('metatype_relationship_pairs.destination_metatype_id', operator, value);
        return this;
    }

    relationship_id(operator: string, value: any) {
        super.query('metatype_relationship_pairs.relationship_id', operator, value);
        return this;
    }

    relationship_type(operator: string, value: any) {
        super.query('metatype_relationship_pairs.relationship_type', operator, value);
        return this;
    }

    ontologyVersion(operator: string, value?: any) {
        super.query('metatype_relationship_pairs.ontology_version', operator, value);
        return this;
    }

    async count(): Promise<Result<number>> {
        const results = await super.count();

        // reset the query
        this._rawQuery = [
            `SELECT metatype_relationship_pairs.*, 
                    origin.name as origin_metatype_name , 
                    destination.name AS destination_metatype_name, 
                    relationships.name AS relationship_pair_name FROM ${MetatypeRelationshipPairMapper.tableName}`,
            `LEFT JOIN metatypes origin ON metatype_relationship_pairs.origin_metatype_id = origin.id`,
            `LEFT JOIN metatypes destination ON metatype_relationship_pairs.destination_metatype_id = destination.id`,
            `LEFT JOIN metatype_relationships relationships ON metatype_relationship_pairs.relationship_id = relationships.id`,
        ];

        if (results.isError) return Promise.resolve(Result.Pass(results));

        return Promise.resolve(Result.Success(results.value));
    }

    async list(loadRelationships = false, options?: QueryOptions, transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair[]>> {
        const results = await super.findAll<MetatypeRelationshipPair>(options, {
            transaction,
            resultClass: MetatypeRelationshipPair,
        });
        // reset the query
        this._rawQuery = [
            `SELECT metatype_relationship_pairs.*, 
                    origin.name as origin_metatype_name , 
                    destination.name AS destination_metatype_name, 
                    relationships.name AS relationship_pair_name FROM ${MetatypeRelationshipPairMapper.tableName}`,
            `LEFT JOIN metatypes origin ON metatype_relationship_pairs.origin_metatype_id = origin.id`,
            `LEFT JOIN metatypes destination ON metatype_relationship_pairs.destination_metatype_id = destination.id`,
            `LEFT JOIN metatype_relationships relationships ON metatype_relationship_pairs.relationship_id = relationships.id`,
        ];

        if (results.isError) return Promise.resolve(Result.Pass(results));

        if (loadRelationships) {
            // logger will take care of informing user of problems
            await Promise.all(
                results.value.map((pair) => {
                    return this.loadRelationships(pair);
                }),
            );
        }

        return Promise.resolve(Result.Success(results.value));
    }
}
