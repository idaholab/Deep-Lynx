/* eslint-disable @typescript-eslint/no-for-in-array */
import RepositoryInterface, {Repository} from '../../repository';
import TypeTransformation from '../../../../data_warehouse/etl/type_transformation';
import Result from '../../../../common_classes/result';
import {User} from '../../../../access_management/user';
import TypeTransformationMapper from '../../../mappers/data_warehouse/etl/type_transformation_mapper';
import Cache from '../../../../services/cache/cache';
import {plainToClass, serialize} from 'class-transformer';
import Config from '../../../../services/config';
import Logger from '../../../../services/logger';
import TypeMappingMapper from '../../../mappers/data_warehouse/etl/type_mapping_mapper';
import TypeMappingRepository from './type_mapping_repository';
import MetatypeKey from '../../../../data_warehouse/ontology/metatype_key';
import MetatypeRelationshipKey from '../../../../data_warehouse/ontology/metatype_relationship_key';
import MetatypeKeyMapper from '../../../mappers/data_warehouse/ontology/metatype_key_mapper';
import MetatypeRelationshipKeyMapper from '../../../mappers/data_warehouse/ontology/metatype_relationship_key_mapper';
import MetatypeRepository from '../ontology/metatype_repository';
import MetatypeRelationshipPairRepository from '../ontology/metatype_relationship_pair_repository';
import MetatypeRelationshipPair from '../../../../data_warehouse/ontology/metatype_relationship_pair';
import Metatype from '../../../../data_warehouse/ontology/metatype';

/*
    TypeTransformationRepository contains methods for persisting and retrieving
    type transformations to storage as well as managing things like validation.
    Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning. Try to avoid using this
    repository in favor of the TypeMapping repository and the TypeMapping domain
    object's methods for managing its transformations
 */
export default class TypeTransformationRepository extends Repository implements RepositoryInterface<TypeTransformation> {
    #mapper: TypeTransformationMapper = TypeTransformationMapper.Instance;
    #metatypeKeyMapper: MetatypeKeyMapper = MetatypeKeyMapper.Instance;
    #relationshipKeyMapper: MetatypeRelationshipKeyMapper = MetatypeRelationshipKeyMapper.Instance;

    delete(t: TypeTransformation): Promise<Result<boolean>> {
        const mappingRepo = new TypeMappingRepository();
        if (t.id) {
            void this.deleteCached(t);
            void mappingRepo.deleteCached(t.type_mapping_id!);

            return this.#mapper.Delete(t.id);
        }

        return Promise.resolve(Result.Failure(`transformation must have id`));
    }

    async findByID(id: string): Promise<Result<TypeTransformation>> {
        const cached = await this.getCached(id);
        if (cached) {
            return Promise.resolve(Result.Success(cached));
        }

        const retrieved = await this.#mapper.Retrieve(id);

        if (!retrieved.isError) {
            // don't fail on cache set failed, it will log itself and move one
            void this.setCache(retrieved.value);
        }

        return Promise.resolve(retrieved);
    }

    async save(t: TypeTransformation, user: User): Promise<Result<boolean>> {
        const errors = await t.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`type transformation does not pass validation ${errors.join(',')}`));
        }

        const mappingRepo = new TypeMappingRepository();
        void mappingRepo.deleteCached(t.type_mapping_id!);

        if (t.id) {
            void this.deleteCached(t);

            const updated = await this.#mapper.Update(user.id!, t);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            Object.assign(t, updated.value);
            return Promise.resolve(Result.Success(true));
        } else {
            const created = await this.#mapper.Create(user.id!, t);
            if (created.isError) return Promise.resolve(Result.Pass(created));

            Object.assign(t, created.value);
            return Promise.resolve(Result.Success(true));
        }

        return Promise.resolve(Result.Success(true));
    }

    constructor() {
        super(TypeTransformationMapper.tableName);
    }

    // this method will iterate through all key mappings on this transformation and populate their names
    // generally this method is only used when we need to export mapping/transformations into a separate
    // container - where the names will be used to match keys instead of the id. No hard failures here
    async populateKeys(transformation: TypeTransformation): Promise<void> {
        // what's faster - looping through the same data twice, or making n number of database calls?
        // by looping through once to separate the ids, we can limit ourselves to a maximum of two database
        // transactions, saving time and resources when dealing with a large amount of exports
        const metatypeKeyIDs: string[] = [];
        const relationshipKeyIDs: string[] = [];

        for (const mapping of transformation.keys) {
            if (mapping.metatype_key_id) metatypeKeyIDs.push(mapping.metatype_key_id);
            if (mapping.metatype_relationship_key_id) relationshipKeyIDs.push(mapping.metatype_relationship_key_id);
        }

        const metatypeKeys: MetatypeKey[] = [];
        const relationshipKeys: MetatypeRelationshipKey[] = [];

        if (metatypeKeyIDs.length > 0) {
            const fetchedKeys = await this.#metatypeKeyMapper.ListFromIDs(metatypeKeyIDs);
            if (!fetchedKeys.isError) metatypeKeys.push(...fetchedKeys.value);
        }

        if (relationshipKeyIDs.length > 0) {
            const fetchedKeys = await this.#relationshipKeyMapper.ListFromIDs(relationshipKeyIDs);
            if (!fetchedKeys.isError) relationshipKeys.push(...fetchedKeys.value);
        }

        transformation.keys.forEach((mapping) => {
            if (mapping.metatype_key_id) mapping.metatype_key = metatypeKeys.find((k) => k.id === mapping.metatype_key_id);
            if (mapping.metatype_relationship_key_id)
                mapping.metatype_relationship_key = relationshipKeys.find((k) => k.id === mapping.metatype_relationship_key_id);
        });

        return Promise.resolve();
    }

    // backfillIDs will attempt to take a transformation and populate the metatype/relationship pair id as well as the
    // keys based on name only. This function is generally only used as part of the type mapping export pipeline and
    // should be used very carefully. This function does not error out of it cannot find the ids specified, the caller
    // must handle the results of this function separately. Note: this function will only run for those transformations
    // which lack either metatype or relationship pair id. Making it safe to call on already populated classes
    async backfillIDs(containerID: string, ...transformations: TypeTransformation[]): Promise<void> {
        // in order to minimize database transactions we will end up looping through the same data multiple times. It's
        // much faster to loop through some in-memory classes than it is to make a very large amount of database transactions
        // especially when you consider this is generally called as part of a very large export of mappings and this function
        // has to be run for each mapping in the export
        const metatypeRepo = new MetatypeRepository();
        const relationshipPairRepo = new MetatypeRelationshipPairRepository();

        const metatypeNames: string[] = [];
        const relationshipPairNames: string[] = [];

        let metatypes: Metatype[] = [];
        let relationshipPairs: MetatypeRelationshipPair[] = [];

        for (const transformation of transformations) {
            if (transformation.metatype_name && !transformation.metatype_id) metatypeNames.push(transformation.metatype_name);
            if (transformation.metatype_relationship_pair_name && !transformation.metatype_relationship_pair_id)
                relationshipPairNames.push(transformation.metatype_relationship_pair_name);
        }

        // fetch all metatypes and relationship pairs by name specified, this allows us to minimize DB calls, though it
        // means we will be looping through the data again further down
        if (metatypeNames.length > 0) {
            const results = await metatypeRepo.where().containerID('eq', containerID).and().name('in', metatypeNames).list();

            if (results.isError) Logger.error(`unable to fetch metatypes for set of transformations on backfill ${results.error?.error}`);
            else metatypes = results.value;
        }

        if (relationshipPairNames.length > 0) {
            const results = await relationshipPairRepo.where()
                .containerID('eq', containerID).and()
                .name('in', relationshipPairNames).list(true); // we want the relationships so we can easily grab the relationship keys

            if (results.isError) Logger.error(`unable to fetch relationship pairs for set of transformations on backfill ${results.error?.error}`);
            else relationshipPairs = results.value;
        }

        // now that we have the metatypes/pairs and their keys - loop through the data again and set id's based on name
        // always check to see if an id is present prior to change, as we don't want to modify any ids already present
        for (const i in transformations) {
            // set metatype id and any attached keys correctly
            if (!transformations[i].metatype_id && transformations[i].metatype_name) {
                const foundMetatype = metatypes.find((m) => m.name === transformations[i].metatype_name);

                if (foundMetatype) {
                    transformations[i].metatype_id = foundMetatype.id;

                    // now set the id's of all the keys
                    for (const j in transformations[i].keys) {
                        if (transformations[i].keys[j].metatype_key && !transformations[i].keys[j].metatype_key_id) {
                            const foundKey = foundMetatype.keys?.find((k) => k.name === transformations[i].keys[j].metatype_key!.name);

                            if (foundKey) transformations[i].keys[j].metatype_key_id = foundKey.id;
                        }
                    }
                }
            }

            // set pair id and any attached relationship keys correctly
            if (!transformations[i].metatype_relationship_pair_id && transformations[i].metatype_relationship_pair_name) {
                const foundPair = relationshipPairs.find((p) => p.name === transformations[i].metatype_relationship_pair_name);

                if (foundPair) {
                    transformations[i].metatype_relationship_pair_id = foundPair.id;

                    // now set the id's of all the keys
                    for (const j in transformations[i].keys) {
                        if (
                            transformations[i].keys[j].metatype_relationship_key &&
                            foundPair.relationship &&
                            !transformations[i].keys[j].metatype_relationship_key_id
                        ) {
                            const foundKey = foundPair.relationship.keys!.find((k) => k.name === transformations[i].keys[j].metatype_relationship_key!.name);

                            if (foundKey) transformations[i].keys[j].metatype_relationship_key_id = foundKey.id;
                        }
                    }
                }
            }
        }

        return Promise.resolve();
    }

    private async getCached(id: string): Promise<TypeTransformation | undefined> {
        const cached = await Cache.get<object>(`${TypeTransformationMapper.tableName}:${id}`);
        if (cached) {
            const transformation = plainToClass(TypeTransformation, cached);
            return Promise.resolve(transformation);
        }

        return Promise.resolve(undefined);
    }

    private async setCache(t: TypeTransformation): Promise<boolean> {
        const set = await Cache.set(`${TypeTransformationMapper.tableName}:${t.id}`, serialize(t), Config.cache_default_ttl);
        if (!set) Logger.error(`unable to set cache for type transformation ${t.id}`);

        return Promise.resolve(set);
    }

    async deleteCached(t: TypeTransformation): Promise<boolean> {
        let deleted = await Cache.del(`${TypeTransformationMapper.tableName}:${t.id}`);
        if (!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`);

        // we must also clear the parent mapping's cache
        deleted = await Cache.del(`${TypeMappingMapper.tableName}:${t.id}`);
        if (!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`);

        deleted = await Cache.del(`${TypeMappingMapper.tableName}:dataSourceID:${t.data_source_id}:shapeHash:${t.shape_hash}`);
        if (!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`);

        return Promise.resolve(deleted);
    }
}
