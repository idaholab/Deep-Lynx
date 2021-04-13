import RepositoryInterface, {QueryOptions, Repository} from "../../repository";
import TypeMapping from "../../../../data_warehouse/etl/type_mapping";
import TypeMappingMapper from "../../../mappers/data_warehouse/etl/type_mapping_mapper";
import Result from "../../../../common_classes/result";
import {PoolClient} from "pg";
import {User} from "../../../../access_management/user";
import TypeTransformation from "../../../../data_warehouse/etl/type_transformation";
import TypeTransformationMapper from "../../../mappers/data_warehouse/etl/type_transformation_mapper";
import Cache from "../../../../services/cache/cache";
import {plainToClass, serialize} from "class-transformer";
import Config from "../../../../services/config";
import Logger from "../../../../services/logger";

/*
    TypeMappingRepository contains methods for persisting and retrieving nodes
    to storage as well as managing things like validation and payload transformation
    based on the mapping and it's transformations. Users should interact with
    repositories when possible and not the mappers as the repositories contain
    additional logic such as validation or transformation prior to storage or returning.
 */
export default class TypeMappingRepository extends Repository implements RepositoryInterface<TypeMapping> {
    #mapper: TypeMappingMapper = TypeMappingMapper.Instance
    #transformationMapper: TypeTransformationMapper = TypeTransformationMapper.Instance

    delete(t: TypeMapping): Promise<Result<boolean>> {
        if(t.id) {
            this.deleteCached(t)

            return this.#mapper.Delete(t.id)
        }

        return Promise.resolve(Result.Failure(`type mapping must have id`))
    }

    async findByID(id: string, loadTransformations:boolean = true): Promise<Result<TypeMapping>> {
        const cached = await this.getCached(id)
        if(cached) {
            return Promise.resolve(Result.Success(cached))
        }

        const retrieved = await this.#mapper.Retrieve(id)

        if(!retrieved.isError && loadTransformations) {
           // we do not want to cache this object unless we have the entire object
            const transformations = await this.#transformationMapper.ListForTypeMapping(retrieved.value.id!)
            if(!transformations.isError) retrieved.value.addTransformation(...transformations.value)

            // don't fail on cache set failed, it will log itself and move on
            this.setCache(retrieved.value)
        }

        return Promise.resolve(retrieved)
    }

    // shape hashes are unique only to data sources, so it will need both to find one
    async findByShapeHash(shapeHash:string, dataSourceID:string, loadTransformations:boolean = true): Promise<Result<TypeMapping>> {
        const cached = await this.getCachedByShapeHash(shapeHash, dataSourceID)
        if(cached) {
            return Promise.resolve(Result.Success(cached))
        }

        const retrieved = await this.#mapper.RetrieveByShapeHash(dataSourceID, shapeHash)

        if(!retrieved.isError && loadTransformations) {
            // we do not want to cache this object unless we have the entire object
            const transformations = await this.#transformationMapper.ListForTypeMapping(retrieved.value.id!)
            if(!transformations.isError) retrieved.value.addTransformation(...transformations.value)

            // don't fail on cache set failed, it will log itself and move one
            this.setCache(retrieved.value)
        }

        return Promise.resolve(retrieved)
    }

    async save(t: TypeMapping, user: User, saveTransformations:boolean = true, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction: boolean = false

        const errors = await t.validationErrors()
        if(errors) {
            return Promise.resolve(Result.Failure(`type mapping does not pass validation ${errors.join(",")}`))
        }

        if(!transaction) {
            const newTransaction = await this.#mapper.startTransaction()
            if(newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate database transaction'))

            transaction = newTransaction.value
            internalTransaction = true // let the function know this is a generated transaction
        }

        if(t.id) {
            this.deleteCached(t)

            const result = await this.#mapper.Update(user.id!, t, transaction)
            if(result.isError) {
                await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(result))
            }

            Object.assign(t, result.value)

            // assign the id to all transformations
            if(t.transformations) t.transformations.forEach(transformation => transformation.type_mapping_id = t.id)

            if(saveTransformations) {
                const transformations = await this.saveTransformations(user, t, transaction)
                if(transformations.isError) {
                    if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                    return Promise.resolve(Result.Failure(`unable to save mapping transformations ${transformations.error?.error}`))
                }
            }

            const committed = await this.#mapper.completeTransaction(transaction)
            if(committed.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`))
            }

            return Promise.resolve(Result.Success(true))
        }

        const result = await this.#mapper.CreateOrUpdate(user.id!, t, transaction)
        if(result.isError) {
            if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
            return Promise.resolve(Result.Pass(result))
        }

        Object.assign(t, result.value)

        // assign the id to all transformations
        if(t.transformations) t.transformations.forEach(transformation => transformation.type_mapping_id = t.id)

        if(saveTransformations) {
            const transformations = await this.saveTransformations(user, t, transaction)
            if(transformations.isError) {
                await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Failure(`unable to save mapping transformations ${transformations.error?.error}`))
            }
        }

        if(internalTransaction) {
            const committed = await this.#mapper.completeTransaction(transaction)
            if(committed.isError) {
                await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`))
            }
        }

        return Promise.resolve(Result.Success(true))
    }

    // this is how users should be managing a type mapping's transformations - not
    // through the type transformation repository if possible.
    async saveTransformations(user: User, t:TypeMapping, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction: boolean = false
        const transformationsUpdate: TypeTransformation[] = []
        const transformationsCreate: TypeTransformation[] = []
        const returnTransformations: TypeTransformation[] = []

        // we wrap this in a transaction so we don't get partially updated keys
        if(!transaction) {
            const newTransaction = await this.#mapper.startTransaction()
            if(newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate database transaction'))

            transaction = newTransaction.value
            internalTransaction = true // let the function know this is a generated transaction
        }

        if(t.removedTransformations && t.removedTransformations.length > 0) {
            t.removedTransformations.forEach(transformation => this.deleteCachedTransformation(transformation))

            const removed = await this.#transformationMapper.BulkDelete(t.removedTransformations, transaction)
            if(removed.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Failure(`unable to delete transformations ${removed.error?.error}`))
            }
        }

        if(t.transformations && t.transformations.length <= 0) {
            if(internalTransaction) {
                const commit = await this.#mapper.completeTransaction(transaction)
                if(commit.isError) return Promise.resolve(Result.Pass(commit))
            }

            return Promise.resolve(Result.Success(true))
        }

        if(t.transformations) for(const transformation of t.transformations) {
            this.deleteCachedTransformation(transformation)
            // set transformation's id to the parent
            transformation.type_mapping_id = t.id

            const errors = await transformation.validationErrors()
            if(errors) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Failure(`one or more transformations do not pass validation ${errors.join(",")}`))
            }

            (transformation.id) ? transformationsUpdate.push(transformation) : transformationsCreate.push(transformation)
        }

        if(transformationsUpdate.length > 0) {
            const results = await this.#transformationMapper.BulkUpdate(user.id!, transformationsUpdate, transaction)
            if(results.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(results))
            }

            returnTransformations.push(...results.value)
        }

        if(transformationsCreate.length > 0) {
            const results = await this.#transformationMapper.BulkCreate(user.id!, transformationsCreate, transaction)
            if(results.isError){
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(results))
            }

            returnTransformations.push(...results.value)
        }

        if(internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction)
            if(commit.isError) return Promise.resolve(Result.Pass(commit))
        }

        t.replaceTransformations(returnTransformations)

        return Promise.resolve(Result.Success(true))
    }

    private async getCached(id: string): Promise<TypeMapping | undefined> {
        const cached = await Cache.get<object>(`${TypeMappingMapper.tableName}:${id}`)
        if(cached) {
            const mapping = plainToClass(TypeMapping, cached)
            return Promise.resolve(mapping)
        }

        return Promise.resolve(undefined)
    }

    private async getCachedByShapeHash(shapeHash: string, dataSourceID: string): Promise<TypeMapping | undefined> {
        const cached = await Cache.get<object>(`${TypeMappingMapper.tableName}:dataSourceID:${dataSourceID}:shapeHash:${shapeHash}`)
        if(cached) {
            const mapping = plainToClass(TypeMapping, cached)
            return Promise.resolve(mapping)
        }

        return Promise.resolve(undefined)
    }

    private async setCache(t: TypeMapping): Promise<boolean> {
        let set = await Cache.set(`${TypeMappingMapper.tableName}:${t.id}`, serialize(t), Config.cache_default_ttl)
        if(!set) Logger.error(`unable to set cache for type mapping${t.id}`)

        set = await Cache.set(`${TypeMappingMapper.tableName}:dataSourceID:${t.data_source_id}:shapeHash:${t.shape_hash}`, serialize(t), Config.cache_default_ttl)
        if(!set) Logger.error(`unable to set cache for type mapping${t.id}`)

        return Promise.resolve(set)
    }

    // delete cached will accept either the full mapping or ID in the case, we do
    // this because there is more than one cache key to work on
    async deleteCached(t: TypeMapping | string): Promise<boolean> {
        if(!(t instanceof TypeMapping)) {
           const retrieved = await this.#mapper.Retrieve(t)
           if(retrieved.isError) Logger.error(`unable to retrieve mapping for cache deletion`)

           t = retrieved.value
        }

        let deleted = await Cache.del(`${TypeMappingMapper.tableName}:${t.id}`)
        if(!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`)

        deleted = await Cache.del(`${TypeMappingMapper.tableName}:dataSourceID:${t.data_source_id}:shapeHash:${t.shape_hash}`)
        if(!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`)

        return Promise.resolve(deleted)
    }

    async deleteCachedTransformation(t: TypeTransformation): Promise<boolean> {
        const deleted = await Cache.del(`${TypeTransformationMapper.tableName}:${t.id}`)
        if(!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`)

        return Promise.resolve(deleted)
    }

    async countForDataSource(dataSourceID: string): Promise<Result<number>> {
       return this.#mapper.Count(dataSourceID)
    }

    async countForDataSourceNoTransformations(dataSourceID: string): Promise<Result<number>> {
        return this.#mapper.CountNoTransformation(dataSourceID)
    }

    constructor() {
        super(TypeMappingMapper.tableName);

        // in order to search based on the name of resulting metatype/metatype relationships
        // we must create a series of joins
        this._rawQuery = [
            'SELECT DISTINCT ON (data_type_mappings.id) data_type_mappings.*, metatypes.name as resulting_metatype_name, metatype_relationships.name as resulting_metatype_relationship_name FROM data_type_mappings',
            'LEFT JOIN data_type_mapping_transformations ON data_type_mappings.id = data_type_mapping_transformations.type_mapping_id',
            'LEFT JOIN metatypes ON data_type_mapping_transformations.metatype_id = metatypes.id',
            'LEFT JOIN metatype_relationship_pairs on data_type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id',
            'LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id '
        ]
    }

    id(operator: string, value: any) {
        super.query("data_type_mappings.id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("data_type_mappings.container_id", operator, value)
        return this
    }

    dataSourceID(operator: string, value: any) {
        super.query("data_type_mappings.data_source_id", operator, value)
        return this
    }

    resultingMetatypeName(operator: string, value: any) {
        super.query("metatypes.name", operator, value)
        return this
    }

    resultingMetatypeRelationshipName(operator: string, value: any) {
        super.query("metatype_relationships.name", operator, value)
        return this
    }

    async count(): Promise<Result<number>> {
        const results = await super.count()
        // reset the query
        this._rawQuery = [
            'SELECT DISTINCT ON (data_type_mappings.id) data_type_mappings.*, metatypes.name as resulting_metatype_name, metatype_relationships.name as resulting_metatype_relationship_name FROM data_type_mappings',
            'LEFT JOIN data_type_mapping_transformations ON data_type_mappings.id = data_type_mapping_transformations.type_mapping_id',
            'LEFT JOIN metatypes ON data_type_mapping_transformations.metatype_id = metatypes.id',
            'LEFT JOIN metatype_relationship_pairs on data_type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id',
            'LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id '
        ]

        return Promise.resolve(Result.Success(results.value))
    }

    async list(loadKeys: boolean = true, options?: QueryOptions, transaction?: PoolClient): Promise<Result<TypeMapping[]>> {
        const results = await super.findAll<TypeMapping>(options, {transaction, resultClass: TypeMapping})
        // reset the query
        this._rawQuery = [
            'SELECT DISTINCT ON (data_type_mappings.id) data_type_mappings.*, metatypes.name as resulting_metatype_name, metatype_relationships.name as resulting_metatype_relationship_name FROM data_type_mappings',
            'LEFT JOIN data_type_mapping_transformations ON data_type_mappings.id = data_type_mapping_transformations.type_mapping_id',
            'LEFT JOIN metatypes ON data_type_mapping_transformations.metatype_id = metatypes.id',
            'LEFT JOIN metatype_relationship_pairs on data_type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id',
            'LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id '
        ]

        if(results.isError) return Promise.resolve(Result.Pass(results))

        if(loadKeys) {
            await Promise.all(results.value.map(async (mapping) => {
                const transformations = await this.#transformationMapper.ListForTypeMapping(mapping.id!)

                return mapping.addTransformation(...transformations.value)
            }))
        }

        return Promise.resolve(Result.Success(results.value))
    }
}
