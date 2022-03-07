/* eslint-disable @typescript-eslint/no-for-in-array */
import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import TypeMapping from '../../../../domain_objects/data_warehouse/etl/type_mapping';
import TypeMappingMapper from '../../../mappers/data_warehouse/etl/type_mapping_mapper';
import Result from '../../../../common_classes/result';
import {PoolClient} from 'pg';
import {User} from '../../../../domain_objects/access_management/user';
import TypeTransformation from '../../../../domain_objects/data_warehouse/etl/type_transformation';
import TypeTransformationMapper from '../../../mappers/data_warehouse/etl/type_transformation_mapper';
import Cache from '../../../../services/cache/cache';
import {plainToClass, serialize} from 'class-transformer';
import Config from '../../../../services/config';
import Logger from '../../../../services/logger';
import DataSourceMapper from '../../../mappers/data_warehouse/import/data_source_mapper';
import TypeTransformationRepository from './type_transformation_repository';
import MetatypeRepository from '../ontology/metatype_repository';
import MetatypeRelationshipPairRepository from '../ontology/metatype_relationship_pair_repository';
import MetatypeRelationshipRepository from '../ontology/metatype_relationship_repository';
import MetatypeKeyRepository from '../ontology/metatype_key_repository';
import MetatypeRelationshipKeyRepository from '../ontology/metatype_relationship_key_repository';

/*
    TypeMappingRepository contains methods for persisting and retrieving nodes
    to storage as well as managing things like validation and payload transformation
    based on the mapping and it's transformations. Users should interact with
    repositories when possible and not the mappers as the repositories contain
    additional logic such as validation or transformation prior to storage or returning.
 */
export default class TypeMappingRepository extends Repository implements RepositoryInterface<TypeMapping> {
    #mapper: TypeMappingMapper = TypeMappingMapper.Instance;
    #dataSourceMapper: DataSourceMapper = DataSourceMapper.Instance;
    #transformationRepo: TypeTransformationRepository = new TypeTransformationRepository();
    #transformationMapper: TypeTransformationMapper = TypeTransformationMapper.Instance;

    delete(t: TypeMapping): Promise<Result<boolean>> {
        if (t.id) {
            void this.deleteCached(t);

            return this.#mapper.Delete(t.id);
        }

        return Promise.resolve(Result.Failure(`type mapping must have id`));
    }

    async findByID(id: string, loadTransformations = true): Promise<Result<TypeMapping>> {
        const cached = await this.getCached(id);
        if (cached) {
            return Promise.resolve(Result.Success(cached));
        }

        const retrieved = await this.#mapper.Retrieve(id);

        if (!retrieved.isError && loadTransformations) {
            // we do not want to cache this object unless we have the entire object
            const transformations = await this.#transformationMapper.ListForTypeMapping(retrieved.value.id!);
            if (!transformations.isError) retrieved.value.addTransformation(...transformations.value);

            // don't fail on cache set failed, it will log itself and move on
            void this.setCache(retrieved.value);
        }

        return Promise.resolve(retrieved);
    }

    // shape hashes are unique only to data sources, so it will need both to find one
    async findByShapeHash(shapeHash: string, dataSourceID: string, loadTransformations = true): Promise<Result<TypeMapping>> {
        const cached = await this.getCachedByShapeHash(shapeHash, dataSourceID);
        if (cached) {
            return Promise.resolve(Result.Success(cached));
        }

        const retrieved = await this.#mapper.RetrieveByShapeHash(dataSourceID, shapeHash);

        if (!retrieved.isError && loadTransformations) {
            // we do not want to cache this object unless we have the entire object
            const transformations = await this.#transformationMapper.ListForTypeMapping(retrieved.value.id!);
            if (!transformations.isError) retrieved.value.addTransformation(...transformations.value);

            // don't fail on cache set failed, it will log itself and move one
            void this.setCache(retrieved.value);
        }

        return Promise.resolve(retrieved);
    }

    async save(t: TypeMapping, user: User, saveTransformations = true, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction = false;

        const errors = await t.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`type mapping does not pass validation ${errors.join(',')}`));
        }

        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate database transaction'));

            transaction = newTransaction.value;
            internalTransaction = true; // let the function know this is a generated transaction
        }

        if (t.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(t.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, t);

            void this.deleteCached(t);

            const result = await this.#mapper.Update(user.id!, original.value, transaction);
            if (result.isError) {
                await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(result));
            }

            Object.assign(t, result.value);

            // assign the id to all transformations
            if (t.transformations) t.transformations.forEach((transformation) => (transformation.type_mapping_id = t.id));

            if (saveTransformations) {
                const transformations = await this.saveTransformations(user, t, transaction);
                if (transformations.isError) {
                    if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                    return Promise.resolve(Result.Failure(`unable to save mapping transformations ${transformations.error?.error}`));
                }
            }

            const committed = await this.#mapper.completeTransaction(transaction);
            if (committed.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`));
            }

            return Promise.resolve(Result.Success(true));
        }

        const result = await this.#mapper.CreateOrUpdate(user.id!, t, transaction);
        if (result.isError) {
            if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
            return Promise.resolve(Result.Pass(result));
        }

        Object.assign(t, result.value);

        // assign the id to all transformations
        if (t.transformations) t.transformations.forEach((transformation) => (transformation.type_mapping_id = t.id));

        if (saveTransformations) {
            const transformations = await this.saveTransformations(user, t, transaction);
            if (transformations.isError) {
                await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`unable to save mapping transformations ${transformations.error?.error}`));
            }
        }

        if (internalTransaction) {
            const committed = await this.#mapper.completeTransaction(transaction);
            if (committed.isError) {
                await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`));
            }
        }

        return Promise.resolve(Result.Success(true));
    }

    // this is how users should be managing a type mapping's transformations - not
    // through the type transformation repository if possible.
    async saveTransformations(user: User, t: TypeMapping, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction = false;
        const transformationsUpdate: TypeTransformation[] = [];
        const transformationsCreate: TypeTransformation[] = [];
        const returnTransformations: TypeTransformation[] = [];

        // we wrap this in a transaction so we don't get partially updated keys
        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate database transaction'));

            transaction = newTransaction.value;
            internalTransaction = true; // let the function know this is a generated transaction
        }

        if (t.removedTransformations && t.removedTransformations.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            t.removedTransformations.forEach((transformation) => this.deleteCachedTransformation(transformation));

            const removed = await this.#transformationMapper.BulkDelete(t.removedTransformations, transaction);
            if (removed.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`unable to delete transformations ${removed.error?.error}`));
            }
        }

        if (t.transformations && t.transformations.length <= 0) {
            if (internalTransaction) {
                const commit = await this.#mapper.completeTransaction(transaction);
                if (commit.isError) return Promise.resolve(Result.Pass(commit));
            }

            return Promise.resolve(Result.Success(true));
        }

        if (t.transformations)
            for (const transformation of t.transformations) {
                void this.deleteCachedTransformation(transformation);
                // set transformation's id to the parent
                transformation.type_mapping_id = t.id;

                const errors = await transformation.validationErrors();
                if (errors) {
                    if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                    return Promise.resolve(Result.Failure(`one or more transformations do not pass validation ${errors.join(',')}`));
                }

                transformation.id ? transformationsUpdate.push(transformation) : transformationsCreate.push(transformation);
            }

        if (transformationsUpdate.length > 0) {
            const results = await this.#transformationMapper.BulkUpdate(user.id!, transformationsUpdate, transaction);
            if (results.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(results));
            }

            returnTransformations.push(...results.value);
        }

        if (transformationsCreate.length > 0) {
            const results = await this.#transformationMapper.BulkCreate(user.id!, transformationsCreate, transaction);
            if (results.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(results));
            }

            returnTransformations.push(...results.value);
        }

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        t.replaceTransformations(returnTransformations);

        return Promise.resolve(Result.Success(true));
    }

    private async getCached(id: string): Promise<TypeMapping | undefined> {
        const cached = await Cache.get<object>(`${TypeMappingMapper.tableName}:${id}`);
        if (cached) {
            const mapping = plainToClass(TypeMapping, cached);
            return Promise.resolve(mapping);
        }

        return Promise.resolve(undefined);
    }

    private async getCachedByShapeHash(shapeHash: string, dataSourceID: string): Promise<TypeMapping | undefined> {
        const cached = await Cache.get<object>(`${TypeMappingMapper.tableName}:dataSourceID:${dataSourceID}:shapeHash:${shapeHash}`);
        if (cached) {
            const mapping = plainToClass(TypeMapping, cached);
            return Promise.resolve(mapping);
        }

        return Promise.resolve(undefined);
    }

    private async setCache(t: TypeMapping): Promise<boolean> {
        let set = await Cache.set(`${TypeMappingMapper.tableName}:${t.id}`, serialize(t), Config.cache_default_ttl);
        if (!set) Logger.error(`unable to set cache for type mapping${t.id}`);

        set = await Cache.set(
            `${TypeMappingMapper.tableName}:dataSourceID:${t.data_source_id}:shapeHash:${t.shape_hash}`,
            serialize(t),
            Config.cache_default_ttl,
        );
        if (!set) Logger.error(`unable to set cache for type mapping${t.id}`);

        return Promise.resolve(set);
    }

    // delete cached will accept either the full mapping or ID in the case, we do
    // this because there is more than one cache key to work on
    async deleteCached(t: TypeMapping | string): Promise<boolean> {
        if (!(t instanceof TypeMapping)) {
            const retrieved = await this.#mapper.Retrieve(t);
            if (retrieved.isError) Logger.error(`unable to retrieve mapping for cache deletion`);

            t = retrieved.value;
        }

        let deleted = await Cache.del(`${TypeMappingMapper.tableName}:${t.id}`);
        if (!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`);

        deleted = await Cache.del(`${TypeMappingMapper.tableName}:dataSourceID:${t.data_source_id}:shapeHash:${t.shape_hash}`);
        if (!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`);

        return Promise.resolve(deleted);
    }

    async deleteCachedTransformation(t: TypeTransformation): Promise<boolean> {
        const deleted = await Cache.del(`${TypeTransformationMapper.tableName}:${t.id}`);
        if (!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`);

        return Promise.resolve(deleted);
    }

    // importToDataSource will take type mappings transfer them and their transformations to a different data source
    // this data source can be within the same container, or a separate container - but keep in mind that exporting
    // to a different container means the transformations will attempt to match their relationships to metatype/relationships
    // by name instead of uuid - so there is potential for issues, use with caution. We return the newly modified/created
    // type mappings as well as failed mappings so that the end user can perform a review of the export - check the value
    // of isError on the return to determine if import was successful
    async importToDataSource(targetSourceID: string, user: User, ...originalMappings: TypeMapping[]): Promise<Result<TypeMapping>[]> {
        // pull in the target data source, immediately error out if the source isn't valid, we also need it for the container
        // in this case we're using the data source mapper because we have no need of actually performing any operations
        const targetDataSource = await this.#dataSourceMapper.Retrieve(targetSourceID);
        if (targetDataSource.isError) return Promise.resolve([Result.Failure(`unable to retrieve target data source`)]);

        const imported: Promise<Result<TypeMapping>>[] = [];

        // copy the array so we don't accidentally modify the original
        const mappings: TypeMapping[] = originalMappings.map((m) => plainToClass(TypeMapping, Object.assign({}, m)));

        // we use destructuring here so that we can have access to the unmodified version of the mapping in case of failure
        // this way we can return the original mapping so that the user can do with them what they will without having to
        // re-prepare an import
        // eslint-disable-next-line prefer-const
        for (let [index, mapping] of mappings.entries()) {
            imported.push(
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                new Promise(async (resolve) => {
                    // even if the mappings are coming from a json file, generated by preparing for import and then having
                    // the user download the results, we still run this function. If it's already prepped nothing will be modified
                    // we do this because unless we check multiple fields, we have no way of being 100% sure it's been prepared
                    mapping = await this.prepareForImport(mapping, mapping.container_id !== targetDataSource.value.container_id);

                    // now we set the proper ID's on the mapping - the transformation will have its ids set correctly once we
                    // call the repo's save method on the modified mapping.
                    mapping.data_source_id = targetDataSource.value.id;
                    mapping.container_id = targetDataSource.value.container_id;
                    mapping.active = false; // always inactivate the mapping after modification

                    // now we must iterate through the transformations and potentially back-fill the metatype/relationship
                    // ids and key ids if all that are present are the names - note that this will not modify the mapping if
                    // the transformation and keys already have id's present, allows us to skip any checks prior to attempting
                    // the function
                    if (mapping.transformations) await this.#transformationRepo.backfillIDs(targetDataSource.value.container_id!, ...mapping.transformations);

                    // now we can save the newly modified mapping
                    const saved = await this.save(mapping, user, true);

                    // on failure we return the original, unmodified mapping for review
                    if (saved.isError) resolve(Result.Failure(saved.error?.error!, 500, mappings[index]));
                    else resolve(Result.Success(mapping));
                }),
            );
        }

        return Promise.all(imported);
    }

    // prepareForImport takes a single TypeMapping and transformations and transforms it into a "neutral" state for later
    // import - it will wipe out all existing ID fields, and will fill the metatype/relationship key names so that they
    // can be imported into a separate container or instance later on. We would include this on the domain object, were
    // it not for the populateKeys call that needs to be made to back-fill information from the database
    async prepareForImport(typeMapping: TypeMapping, separateContainer = true): Promise<TypeMapping> {
        // run transformation work prior to manipulating any data on the mapping itself
        if (typeMapping.transformations)
            for (const i in typeMapping.transformations) {
                // we wipe different fields depending on whether or not this is a separate container, as if it's the same
                // we can reuse a good chunk of the ids
                if (separateContainer) {
                    // populate the key names so that the import function can look them up without ids, if for whatever
                    // reason the prepare for import has already run (e.g someone uploading a json file) then this function
                    // will do nothing
                    await this.#transformationRepo.populateKeys(typeMapping.transformations[i]);

                    for (const j in typeMapping.transformations[i].keys) {
                        typeMapping.transformations[i].keys[j].metatype_relationship_key_id = undefined;
                        typeMapping.transformations[i].keys[j].metatype_key_id = undefined;
                    }

                    typeMapping.transformations[i].metatype_id = undefined;
                    typeMapping.transformations[i].metatype_relationship_pair_id = undefined;
                }

                // now clear all the id's
                typeMapping.transformations[i].type_mapping_id = undefined;
                typeMapping.transformations[i].id = undefined;
                typeMapping.transformations[i].container_id = undefined;
                typeMapping.transformations[i].data_source_id = undefined;
                typeMapping.transformations[i].shape_hash = undefined;

                typeMapping.transformations[i].created_by = undefined;
                typeMapping.transformations[i].created_at = undefined;
                typeMapping.transformations[i].modified_by = undefined;
                typeMapping.transformations[i].modified_at = undefined;
            }

        if (separateContainer) {
            typeMapping.container_id = undefined;
        }

        typeMapping.id = undefined;
        typeMapping.data_source_id = undefined;
        typeMapping.created_at = undefined;
        typeMapping.created_by = undefined;
        typeMapping.modified_at = undefined;
        typeMapping.modified_by = undefined;

        return Promise.resolve(typeMapping);
    }

    // upgrade mappings accepts an ontology version and a set of mappings and attempts to upgrade all transformations
    // for the mappings to the current ontology version - this requires stripping the transformations of their current
    // metatype/pair and key ids and attempting to find the match by name in the current ontology - don't make the mistake
    // of thinking you can just use the old_id field and pull data that way - an ontology version might not be the one
    // the changelist was created from, causing mismatches - the only way is by name matching (names are unique per container)
    // we also assume that none of the mappings here have their transformations
    // MAPPINGS MUST COME FROM THE SAME CONTAINER
    async upgradeMappings(ontologyVersion: string, ...mappings: TypeMapping[]): Promise<Result<boolean>[]> {
        if (mappings.length === 0) return Promise.resolve([Result.Failure('no mappings present to upgrade')]);

        const metatypeRepo = new MetatypeRepository();
        const relationshipRepo = new MetatypeRelationshipRepository();
        const pairRepo = new MetatypeRelationshipPairRepository();
        const transformationRepo = new TypeTransformationRepository();

        // first fetch all transformations for all mappings - don't loop and contain them on the parent object because
        // we want to minimize the amount of times we're going back to the database, and it simplifies the function if
        // we're working with a list of transformations
        const transformations = await transformationRepo
            .where()
            .typeMappingID('in', mappings.map((m) => m.id).join(','))
            .list();

        if (transformations.isError) return Promise.resolve([Result.Failure('unable to list transformations for upgrading')]);

        // with all transformations fetched, fetch all metatypes and pairs based on the transformations NAMES - again we
        // want to keep our database call amount low, easier to filter in memory than call the same metatype/pair filter
        // functions on n number of transformations - this might need looked at if we start to run into memory issues, but
        // generally there won't be tens of thousands of transformations in a container, we'll fetch the keys for the
        // new metatypes
        const metatypeNames: string[] = [];
        const pairNames: string[] = [];

        transformations.value.forEach((t) => {
            if (t.metatype_name) {
                metatypeNames.push(t.metatype_name);
            }

            if (t.metatype_relationship_pair_name) {
                pairNames.push(t.metatype_relationship_pair_name);
            }
        });

        const metatypes = await metatypeRepo
            .where()
            .containerID('eq', mappings[0].container_id)
            .and()
            .ontologyVersion('eq', ontologyVersion)
            .and()
            .name('in', metatypeNames.join(','))
            .list(true);
        if (metatypes.isError) return Promise.resolve([Result.Failure('unable to list metatypes')]);

        const pairs = await pairRepo
            .where()
            .containerID('eq', mappings[0].container_id)
            .and()
            .ontologyVersion('eq', ontologyVersion)
            .and()
            .name('in', pairNames.join(','))
            .list();
        if (pairs.isError) return Promise.resolve([Result.Failure('unable to list relationship pairs')]);

        // we have to single out the relationships so we can get the keys loaded on them
        const relationships = await relationshipRepo
            .where()
            .containerID('eq', mappings[0].container_id)
            .and()
            .ontologyVersion('eq', ontologyVersion)
            .and()
            .id('in', pairs.value.map((p) => p.relationship_id).join(','))
            .list(true);
        if (relationships.isError) return Promise.resolve([Result.Failure('unable to list relationships')]);

        const results: Result<boolean>[] = [];

        // for each transformation find the current id by searching the fetched metatypes/pair and keys and update the object
        transformations.value.forEach((t, i) => {
            if (t.metatype_id) {
                const foundMetatype = metatypes.value.find((m) => m.name === t.metatype_name);
                if (!foundMetatype) {
                    results.push(Result.Failure(`unable to find metatype by name for transformation ${t.id}`));
                    return;
                }

                transformations.value[i].metatype_id = foundMetatype.id;

                // now loop through the keys, comparing with the found metatype's keys - if we can't find one, remove it
                // from the main transformation and add it into the failed upgraded key array on the configuration object
                transformations.value[i].keys.forEach((k, j) => {
                    if (k.metatype_key && foundMetatype.keys) {
                        const foundKey = foundMetatype.keys.find((newKey) => newKey.name === k.metatype_key?.name);
                        if (!foundKey) {
                            transformations.value[i].config.failed_upgraded_keys.push(...transformations.value[i].keys.splice(j, 1));
                            return;
                        }

                        transformations.value[i].keys[j].metatype_key = foundKey;
                        transformations.value[i].keys[j].metatype_key_id = foundKey.id;
                    } else {
                        transformations.value[i].config.failed_upgraded_keys.push(...transformations.value[i].keys.splice(j, 1));
                    }
                });
            }

            if (t.metatype_relationship_pair_id) {
                const foundMetatypeRelationshipPair = pairs.value.find((p) => p.name === t.metatype_relationship_pair_name);
                if (!foundMetatypeRelationshipPair) {
                    results.push(Result.Failure(`unable to find metatype relationship pair by name for transformation ${t.id}`));
                    return;
                }

                transformations.value[i].metatype_relationship_pair_id = foundMetatypeRelationshipPair.id;

                const foundRelationship = relationships.value.find((r) => r.id === foundMetatypeRelationshipPair.relationship_id);

                // now loop through the keys, comparing with the found metatype's keys - if we can't find one, remove it
                // from the main transformation and add it into the failed upgraded key array on the configuration object
                transformations.value[i].keys.forEach((k, j) => {
                    if (k.metatype_relationship_key && foundRelationship?.keys) {
                        const foundKey = foundRelationship.keys.find((newKey) => newKey.name === k.metatype_relationship_key?.name);
                        if (!foundKey) {
                            transformations.value[i].config.failed_upgraded_keys.push(...transformations.value[i].keys.splice(j, 1));
                            return;
                        }

                        transformations.value[i].keys[j].metatype_relationship_key = foundKey;
                        transformations.value[i].keys[j].metatype_relationship_key_id = foundKey.id;
                    } else {
                        transformations.value[i].config.failed_upgraded_keys.push(...transformations.value[i].keys.splice(j, 1));
                    }
                });
            }

            // if we've made it here, count it as a successful upgrade
            results.push(Result.Success(true));
        });

        const saved = await TypeTransformationMapper.Instance.BulkUpdate('system', transformations.value);
        if (saved.isError) return Promise.resolve([Result.Failure(`unable to save modified transformations ${saved.error?.error}`)]);

        for (const m of mappings) await this.deleteCached(m);

        // with all transformations saved, bulk save them, use the mapper since we don't need any validation here
        return Promise.resolve(results);
    }

    async countForDataSource(dataSourceID: string): Promise<Result<number>> {
        return this.#mapper.Count(dataSourceID);
    }

    async countForDataSourceNoTransformations(dataSourceID: string): Promise<Result<number>> {
        return this.#mapper.CountNoTransformation(dataSourceID);
    }

    constructor() {
        super(TypeMappingMapper.tableName);

        // in order to search based on the name of resulting metatype/metatype relationships
        // we must create a series of joins
        this._rawQuery = [
            `SELECT DISTINCT ON (type_mappings.id) type_mappings.*, 
             metatypes.name as resulting_metatype_name, metatype_relationships.name as resulting_metatype_relationship_name FROM type_mappings`,
            'LEFT JOIN type_mapping_transformations ON type_mappings.id = type_mapping_transformations.type_mapping_id',
            'LEFT JOIN metatypes ON type_mapping_transformations.metatype_id = metatypes.id',
            'LEFT JOIN metatype_relationship_pairs on type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id',
            'LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id ',
        ];
    }

    id(operator: string, value: any) {
        super.query('type_mappings.id', operator, value);
        return this;
    }

    containerID(operator: string, value: any) {
        super.query('type_mappings.container_id', operator, value);
        return this;
    }

    dataSourceID(operator: string, value: any) {
        super.query('type_mappings.data_source_id', operator, value);
        return this;
    }

    active(operator: string, value: any) {
        super.query('type_mappings.active', operator, value);
        return this;
    }

    resultingMetatypeName(operator: string, value: any) {
        super.query('metatypes.name', operator, value);
        return this;
    }

    resultingMetatypeRelationshipName(operator: string, value: any) {
        super.query('metatype_relationships.name', operator, value);
        return this;
    }

    async count(): Promise<Result<number>> {
        const results = await super.count();
        // reset the query
        this._rawQuery = [
            `SELECT DISTINCT ON (type_mappings.id) type_mappings.*, 
             metatypes.name as resulting_metatype_name, metatype_relationships.name as resulting_metatype_relationship_name FROM type_mappings`,
            'LEFT JOIN type_mapping_transformations ON type_mappings.id = type_mapping_transformations.type_mapping_id',
            'LEFT JOIN metatypes ON type_mapping_transformations.metatype_id = metatypes.id',
            'LEFT JOIN metatype_relationship_pairs on type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id',
            'LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id ',
        ];

        return Promise.resolve(Result.Success(results.value));
    }

    async list(loadTransformations = true, options?: QueryOptions, transaction?: PoolClient): Promise<Result<TypeMapping[]>> {
        const results = await super.findAll<TypeMapping>(options, {
            transaction,
            resultClass: TypeMapping,
        });
        // reset the query
        this._rawQuery = [
            `SELECT DISTINCT ON (type_mappings.id) type_mappings.*, 
             metatypes.name as resulting_metatype_name, metatype_relationships.name as resulting_metatype_relationship_name FROM type_mappings`,
            'LEFT JOIN type_mapping_transformations ON type_mappings.id = type_mapping_transformations.type_mapping_id',
            'LEFT JOIN metatypes ON type_mapping_transformations.metatype_id = metatypes.id',
            'LEFT JOIN metatype_relationship_pairs on type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id',
            'LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id ',
        ];

        if (results.isError) return Promise.resolve(Result.Pass(results));

        if (loadTransformations) {
            await Promise.all(
                results.value.map(async (mapping) => {
                    const transformations = await this.#transformationMapper.ListForTypeMapping(mapping.id!);

                    return mapping.addTransformation(...transformations.value);
                }),
            );
        }

        return Promise.resolve(Result.Success(results.value));
    }
}
