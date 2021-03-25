import RepositoryInterface, {Repository} from "../../repository";
import TypeTransformation from "../../../../data_warehouse/etl/type_transformation";
import Result from "../../../../common_classes/result";
import {User} from "../../../../access_management/user";
import TypeTransformationMapper from "../../../mappers/data_warehouse/etl/type_transformation_mapper";
import Cache from "../../../../services/cache/cache";
import {plainToClass, serialize} from "class-transformer";
import Config from "../../../../services/config";
import Logger from "../../../../services/logger";
import TypeMappingMapper from "../../../mappers/data_warehouse/etl/type_mapping_mapper";

export default class TypeTransformationRepository extends Repository implements RepositoryInterface<TypeTransformation> {
    #mapper: TypeTransformationMapper = TypeTransformationMapper.Instance

    delete(t: TypeTransformation): Promise<Result<boolean>> {
        if(t.id) {
            this.deleteCached(t)

            return this.#mapper.PermanentlyDelete(t.id)
        }

        return Promise.resolve(Result.Failure(`transformation must have id`))
    }

    async findByID(id: string): Promise<Result<TypeTransformation>> {
        const cached = await this.getCached(id)
        if(cached) {
            return Promise.resolve(Result.Success(cached))
        }

        const retrieved = await this.#mapper.Retrieve(id)

        if(!retrieved.isError) {
            // don't fail on cache set failed, it will log itself and move one
            this.setCache(retrieved.value)
        }

        return Promise.resolve(retrieved)
    }

    async save(t: TypeTransformation, user: User): Promise<Result<boolean>> {
        const errors = await t.validationErrors()
        if(errors) {
            return Promise.resolve(Result.Failure(`type transformation does not pass validation ${errors.join(",")}`))
        }

        if(t.id) {
           this.deleteCached(t)

           const updated = await this.#mapper.Update(user.id!, t)
           if(updated.isError) return Promise.resolve(Result.Pass(updated))

           Object.assign(t, updated.value)
           return Promise.resolve(Result.Success(true))
        } else {
            const created = await this.#mapper.Create(user.id!, t)
            if(created.isError) return Promise.resolve(Result.Pass(created))

            Object.assign(t, created.value)
            return Promise.resolve(Result.Success(true))
        }

        return Promise.resolve(Result.Success(true))
    }

    constructor() {
        super(TypeTransformationMapper.tableName);
    }

    private async getCached(id: string): Promise<TypeTransformation | undefined> {
        const cached = await Cache.get<object>(`${TypeTransformationMapper.tableName}:${id}`)
        if(cached) {
            const transformation = plainToClass(TypeTransformation, cached)
            return Promise.resolve(transformation)
        }

        return Promise.resolve(undefined)
    }

    private async setCache(t: TypeTransformation): Promise<boolean> {
        const set = await Cache.set(`${TypeTransformationMapper.tableName}:${t.id}`, serialize(t), Config.cache_default_ttl)
        if(!set) Logger.error(`unable to set cache for type transformation ${t.id}`)

        return Promise.resolve(set)
    }

    async deleteCached(t: TypeTransformation): Promise<boolean> {
        let deleted = await Cache.del(`${TypeTransformationMapper.tableName}:${t.id}`)
        if(!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`)

        // we must also clear the parent mapping's cache
        deleted = await Cache.del(`${TypeMappingMapper.tableName}:${t.id}`)
        if(!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`)

        deleted = await Cache.del(`${TypeMappingMapper.tableName}:dataSourceID:${t.data_source_id}:shapeHash:${t.shape_hash}`)
        if(!deleted) Logger.error(`unable to remove type mapping ${t.id} from cache`)

        return Promise.resolve(deleted)
    }
}
