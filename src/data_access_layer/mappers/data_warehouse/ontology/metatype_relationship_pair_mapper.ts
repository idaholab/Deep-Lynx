import Result from "../../../../result"
import Mapper from "../../mapper";
import { PoolClient, QueryConfig} from "pg";
import MetatypeRelationshipPair from "../../../../data_warehouse/ontology/metatype_relationship_pair";
import uuid from "uuid";
import {plainToClass} from "class-transformer";
const format = require('pg-format')

/*
* MetatypeRelationshipPairMapper encompasses all logic dealing with the manipulation
* of the Metatype Relationship Pair class in a data storage layer.
*/
export default class MetatypeRelationshipPairMapper extends Mapper{
    public static tableName = "metatype_relationship_pairs";

    private static instance: MetatypeRelationshipPairMapper;

    public static get Instance(): MetatypeRelationshipPairMapper {
        if(!MetatypeRelationshipPairMapper.instance) {
            MetatypeRelationshipPairMapper.instance = new MetatypeRelationshipPairMapper()
        }

        return MetatypeRelationshipPairMapper.instance
    }

    public async Create(userID:string, input: MetatypeRelationshipPair, transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair>> {
        const r = await super.runRaw(this.createStatement(userID, input), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        const results = plainToClass(MetatypeRelationshipPair, r.value)

        return Promise.resolve(Result.Success(results[0]))
    }

    public async BulkCreate(userID:string, input: MetatypeRelationshipPair[], transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair[]>> {
        const r = await super.runRaw(this.createStatement(userID, ...input), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(MetatypeRelationshipPair, r.value)))
    }

    public async Retrieve(id:string): Promise<Result<MetatypeRelationshipPair>>{
        const r = await super.retrieveRaw(this.retrieveStatement(id))
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(MetatypeRelationshipPair, r.value)))
    }

    public async Update(userID: string, p: MetatypeRelationshipPair, transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair>> {
        const r = await super.runRaw(this.fullUpdateStatement(userID, p), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        const results = plainToClass(MetatypeRelationshipPair, r.value)

        return Promise.resolve(Result.Success(results[0]))
    }

    public async BulkUpdate(userID: string, p: MetatypeRelationshipPair[], transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair[]>> {
        const r = await super.runRaw(this.fullUpdateStatement(userID, ...p), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))


        return Promise.resolve(Result.Success(plainToClass(MetatypeRelationshipPair, r.value)))
    }

    public async Archive(pairID: string, userID: string): Promise<Result<boolean>> {
        return super.run(this.archiveStatement(pairID, userID))
    }

    public async Delete(pairID: string): Promise<Result<boolean>> {
        return super.run(this.deleteStatement(pairID))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...pairs: MetatypeRelationshipPair[]): string{
            const text = `INSERT INTO
                            metatype_relationship_pairs(id,
                                                        name,
                                                        description,
                                                        relationship_id,
                                                        origin_metatype_id,
                                                        destination_metatype_id,
                                                        relationship_type,
                                                        container_id,
                                                        created_by, modified_by)
                    VALUES %L RETURNING *`

            const values =  pairs.map(pair => [
                uuid.v4(),
                pair.name,
                pair.description,
                pair.relationship!.id,
                pair.originMetatype!.id,
                pair.destinationMetatype!.id,
                pair.relationship_type,
                pair.container_id,
                userID, userID])

            return format(text, values)
    }

    private fullUpdateStatement(userID: string, ...pairs: MetatypeRelationshipPair[]): string {
            const text = `UPDATE metatype_relationship_pairs AS p SET
                            name = u.name,
                            description = u.description,
                            relationship_type = u.relationship_type,
                            relationship_id = u.relationship_id::uuid,
                            origin_metatype_id = u.origin_metatype_id::uuid,
                            destination_metatype_id = u.destination_metatype_id::uuid,
                            container_id = u.container_id::uuid,
                            modified_by = u.modified_by,
                            modified_at = NOW()
                        FROM(VALUES %L) as u(id,
                                            name,
                                            description,
                                            relationship_type,
                                            relationship_id,
                                            origin_metatype_id,
                                            destination_metatype_id,
                                            container_id,
                                            modified_by)
                        WHERE u.id::uuid = p.id RETURNING *`
            const values = pairs.map(p => [
                p.id,
                p.name,
                p.description,
                p.relationship_type,
                p.relationship!.id,
                p.originMetatype!.id,
                p.destinationMetatype!.id,
                p.container_id,
                userID
            ])

            return format(text, values)
    }

    private archiveStatement(pairID: string, userID: string): QueryConfig {
        return {
            text:`UPDATE metatype_relationship_pairs SET archived = true, modified_by = $2  WHERE id = $1`,
            values: [pairID, userID]
        }
    }

    private deleteStatement(pairID: string): QueryConfig {
        return {
            text:`DELETE FROM metatype_relationship_pairs WHERE id = $1`,
            values: [pairID]
        }
    }

    private retrieveStatement(pairID:string): QueryConfig {
        return {
            text:`SELECT * FROM metatype_relationship_pairs WHERE id = $1 AND NOT ARCHIVED `,
            values: [pairID]
        }
    }
}
