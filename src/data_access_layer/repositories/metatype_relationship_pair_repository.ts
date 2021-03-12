import RepositoryInterface, {QueryOptions, Repository} from "./repository_base";
import Result from "../../result";
import Cache from "../../services/cache/cache";
import {plainToClass, serialize} from "class-transformer";
import Config from "../../config";
import Logger from "../../logger";
import MetatypeRelationshipPair from "../../data_warehouse/ontology/metatype_relationship_pair";
import {UserT} from "../../types/user_management/userT";
import MetatypeRelationshipPairMapper from "../mappers/metatype_relationship_pair_mapper";
import MetatypeRepository from "./metatype_repository";
import MetatypeRelationshipRepository from "./metatype_relationship_repository";
import Metatype from "../../data_warehouse/ontology/metatype";
import MetatypeRelationship from "../../data_warehouse/ontology/metatype_relationship";

export default class MetatypeRelationshipPairRepository extends Repository implements RepositoryInterface<MetatypeRelationshipPair> {
    #mapper : MetatypeRelationshipPairMapper = MetatypeRelationshipPairMapper.Instance

    async delete(p: MetatypeRelationshipPair): Promise<Result<boolean>> {
        if(p.id) {
            this.deleteCached(p.id)

            return this.#mapper.Delete(p.id)
        }

        return Promise.resolve(Result.Failure('metatype relationship pair has no id'))
    }

    archive(user: UserT, p: MetatypeRelationshipPair): Promise<Result<boolean>> {
        if (p.id) {
            this.deleteCached(p.id)

            return this.#mapper.Archive(p.id, user.id!)
        }

        return Promise.resolve(Result.Failure('metatype relationship pair has no id'))
    }

    async findByID(id: string): Promise<Result<MetatypeRelationshipPair>> {
        const cached = await this.getCached(id)
        if(cached) {
            return Promise.resolve(Result.Success(cached))
        }

        const retrieved = await this.#mapper.Retrieve(id)

        if(!retrieved.isError) {
            this.setCache(retrieved.value)

            // log on relationship load, but don't fail
            const loaded = await this.loadRelationships(retrieved.value)
            if(loaded.isError) Logger.error(loaded.error?.error!)
        }

        return Promise.resolve(retrieved)
    }

    // save will not save the origin/destination metatypes or metatype relationship unless the
    // user specifies. This is because we might be working with this object with a bare
    // minimum of info about those types
    async save(user: UserT, p: MetatypeRelationshipPair, saveRelationships?: boolean): Promise<Result<MetatypeRelationshipPair>> {
        // attempt to save the relationships first, if required - keep in mind that
        // we can't wrap these in transactions so it is possible that you update one
        // but not another of the relationships. This is why the saveRelationships is
        // turned off by default.
        if(saveRelationships) {
            const metatypeRepo = new MetatypeRepository()
            const relationshipRepo = new MetatypeRelationshipRepository()

            const results = await Promise.all([
                metatypeRepo.save(user, p.originMetatype),
                metatypeRepo.save(user, p.destinationMetatype),
                relationshipRepo.save(user, p.relationship),
            ])

            const errors: string[] = []

            results.forEach(result => {
                if(result.isError) {
                    errors.push(result.error?.error!)
                    return
                }

                if(result.value instanceof Metatype) {
                    // if it's not the origin we can safely assume it's the destination
                    (result.value.id === p.originMetatype.id) ? p.originMetatype = result.value : p.destinationMetatype = result.value
                }

                if(result.value instanceof MetatypeRelationship) {
                    p.relationship = result.value
                }

                if(errors.length > 0) return Promise.resolve(Result.Failure(`one or more relationships failed to save: ${errors.join(',')}`))
            })
        }

        // we run validation after relationship save in case the user included
        // metatypes/relationships to be created as part of the main class
        const errors = await p.validationErrors()
        if(errors) {
            return Promise.resolve(Result.Failure(`metatype relationship pair does not pass validation ${errors.join}`))
        }

        let result: Result<MetatypeRelationshipPair>

        // update if ID has already been set
        if(p.id) {
            this.deleteCached(p.id)
            const updated = await this.#mapper.Update(user.id!, p)
            if(updated.isError) return Promise.resolve(Result.Failure(`failed to updated metatype relationship pair ${updated.error?.error}`))

            // load or reload the relationships - this guarantees we have the latest versions
            const loaded = await this.loadRelationships(updated.value)
            if(loaded.isError) Logger.error(loaded.error?.error!)

            return Promise.resolve(Result.Success(updated.value))
        } else {
            result = await this.#mapper.Create(user.id!, p)
        }

        if(result.isError) return Promise.resolve(Result.Failure(`unable to save metatype relationship pair: ${result.error?.error}`))

        const loaded = await this.loadRelationships(result.value)
        if(loaded.isError) Logger.error(loaded.error?.error!)

        return Promise.resolve(result)
    }

    // attempt to fully load the relationships for the given relationships, we
    // don't trust the cached versions of the relationships as they could have changed
    private async loadRelationships(pair: MetatypeRelationshipPair): Promise<Result<boolean>> {
        const metatypeRepo = new MetatypeRepository()
        const relationshipRepo = new MetatypeRelationshipRepository()

        const results = await Promise.all([
            metatypeRepo.findByID(pair.originMetatype.id!),
            metatypeRepo.findByID(pair.destinationMetatype.id!),
            relationshipRepo.findByID(pair.relationship.id!)
        ])

        const errors: string[] = []

        results.forEach(result => {
            if(result.isError) {
                errors.push(result.error?.error!)
                return
            }

            if(result.value instanceof Metatype) {
                // if it's not the origin we can safely assume it's the destination
                (result.value.id === pair.originMetatype.id) ? pair.originMetatype = result.value : pair.destinationMetatype = result.value
            }

            if(result.value instanceof MetatypeRelationship) {
                pair.relationship = result.value
            }
        })

        return (errors.length > 0) ? Promise.resolve(Result.Failure(`unable to load one or more relationships ${errors.join(',')}`)) : Promise.resolve(Result.Success(true))
    }

    private async getCached(id: string): Promise<MetatypeRelationshipPair | undefined> {
        const cached = await Cache.get<object>(`${MetatypeRelationshipPairMapper.tableName}:${id}`)
        if(cached) {
            const pair = plainToClass(MetatypeRelationshipPair, cached)
            return Promise.resolve(pair)
        }

        return Promise.resolve(undefined)
    }

    private async setCache(p: MetatypeRelationshipPair): Promise<boolean> {
        const set = await Cache.set(`${MetatypeRelationshipPairMapper.tableName}:${p.id}`, serialize(p), Config.cache_default_ttl)
        if(!set) Logger.error(`unable to set cache for metatype relationship pair ${p.id}`)

        return Promise.resolve(set)
    }

    private async deleteCached(id: string): Promise<boolean> {
        const deleted = await Cache.del(`${MetatypeRelationshipPairMapper.tableName}:${id}`)
        if(!deleted) Logger.error(`unable to remove metatype relationship pair ${id} from cache`)

        return Promise.resolve(deleted)
    }

    constructor() {
        super(MetatypeRelationshipPairMapper.tableName);
        // in order to select the composite fields we must redo the initial query
        // to accept LEFT JOINs
        this._rawQuery = [
            `SELECT metatype_relationship_pairs.*, origin.name as origin_metatype_name , destination.name AS destination_metatype_name, relationships.name AS relationship_pair_name FROM ${MetatypeRelationshipPairMapper.tableName}`,
            `LEFT JOIN metatypes origin ON metatype_relationship_pairs.origin_metatype_id = origin.id`,
            `LEFT JOIN metatypes destination ON metatype_relationship_pairs.destination_metatype_id = destination.id`,
            `LEFT JOIN metatype_relationships relationships ON metatype_relationship_pairs.relationship_id = relationships.id`,
        ]
    }

    id(operator: string, value: any) {
        super.query("metatype_relationship_pairs.id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("metatype_relationship_pairs.container_id", operator, value)
        return this
    }

    name(operator: string, value: any) {
        super.query("metatype_relationship_pairs.name", operator, value)
        return this
    }

    description(operator: string, value: any) {
        super.query("metatype_relationship_pairs.description", operator, value)
        return this
    }

    // metatypeID will search relationships by both origin and destination
    metatypeID(operator: string, value: any) {
        return this.origin_metatype_id(operator, value).or().destination_metatype_id(operator, value)
    }


    origin_metatype_id(operator: string, value: any) {
        super.query("metatype_relationship_pairs.origin_metatype_id", operator, value)
        return this
    }

    destination_metatype_id(operator: string, value: any) {
        super.query("metatype_relationship_pairs.destination_metatype_id", operator, value)
        return this
    }

    relationship_id(operator: string, value: any) {
        super.query("metatype_relationship_pairs.relationship_id", operator, value)
        return this
    }

    relationship_type(operator: string, value: any) {
        super.query("metatype_relationship_pairs.relationship_type", operator, value)
        return this
    }

    archived(operator: string, value: any) {
        super.query("metatype_relationship_pairs.archived", operator, value)
        return this
    }

    count(): Promise<Result<number>> {
        return super.count()
    }

    async list(loadRelationships: boolean = false, options?: QueryOptions): Promise<Result<MetatypeRelationshipPair[]>> {
        const results = await super.findAll<object>(options)
        if(results.isError) return Promise.resolve(Result.Pass(results))

        const pairs = plainToClass(MetatypeRelationshipPair, results.value)

        if(loadRelationships) {
            // logger will take care of informing user of problems
            await Promise.all(pairs.map((pair) => {
                return this.loadRelationships(pair)
            }))
        }

        // reset the query
        this._rawQuery = [
            `SELECT metatype_relationship_pairs.*, origin.name as origin_metatype_name , destination.name AS destination_metatype_name, relationships.name AS relationship_pair_name FROM ${MetatypeRelationshipPairMapper.tableName}`,
            `LEFT JOIN metatypes origin ON metatype_relationship_pairs.origin_metatype_id = origin.id`,
            `LEFT JOIN metatypes destination ON metatype_relationship_pairs.destination_metatype_id = destination.id`,
            `LEFT JOIN metatype_relationships relationships ON metatype_relationship_pairs.relationship_id = relationships.id`,
        ]

        return Promise.resolve(Result.Success(pairs))
    }
}

