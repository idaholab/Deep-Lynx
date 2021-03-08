import RepositoryInterface, {Repository} from "./repository_base";
import Metatype from "../../data_warehouse/ontology/metatype";
import Result from "../../result";
import {UserT} from "../../types/user_management/userT";
import Cache from "../../services/cache/cache";
import Config from "../../config";
import Logger from "../../logger";
import MetatypeMapper from "../mappers/metatype_mapper";
import {plainToClass, serialize} from "class-transformer";
import MetatypeKeyStorage from "../mappers/metatype_key_storage";
import MetatypeKey from "../../data_warehouse/ontology/metatype_key";

export default class MetatypeRepository extends Repository implements RepositoryInterface<Metatype> {
    #mapper: MetatypeMapper = MetatypeMapper.Instance

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
            return new Promise(resolve => resolve(Result.Success(cached)))
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

    save(user: UserT, t: Metatype): Promise<Result<Metatype>> {
        return Promise.resolve(Result.Failure('unimplemented'));
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
            const keys = await MetatypeKeyStorage.Instance.List(metatype.id!)

            metatype.keys = plainToClass(MetatypeKey, keys.value)
        }))

        return Promise.resolve(Result.Success(metatypes))
    }

}
