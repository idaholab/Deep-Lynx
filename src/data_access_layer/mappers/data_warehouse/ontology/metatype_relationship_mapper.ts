import Result from "../../../../result"
import Mapper from "../../mapper";
import {PoolClient, QueryConfig} from "pg";
import uuid from "uuid";
import {plainToClass} from "class-transformer";
import MetatypeRelationship from "../../../../data_warehouse/ontology/metatype_relationship";
const format = require('pg-format')

/*
* MetatypeRelationshipMapper encompasses all logic dealing with the manipulation of the Metatype Relationship
* class in a data storage layer.
*/
export default class MetatypeRelationshipMapper extends Mapper{
    public static tableName = "metatype_relationships";

    private static instance: MetatypeRelationshipMapper;

    public static get Instance(): MetatypeRelationshipMapper {
        if(!MetatypeRelationshipMapper.instance) {
            MetatypeRelationshipMapper.instance = new MetatypeRelationshipMapper()
        }

        return MetatypeRelationshipMapper.instance
    }

    public async Create(userID:string, input: MetatypeRelationship, transaction?: PoolClient): Promise<Result<MetatypeRelationship>> {
        const r = await super.runRaw(this.createStatement(userID, input), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        const results = plainToClass(MetatypeRelationship, r.value)

        return Promise.resolve(Result.Success(results[0]))
    }

    public async BulkCreate(userID: string, m: MetatypeRelationship[], transaction?: PoolClient): Promise<Result<MetatypeRelationship[]>> {
        const r = await super.runRaw(this.createStatement(userID, ...m), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(MetatypeRelationship, r.value)))
    }

    public async Retrieve(id: string): Promise<Result<MetatypeRelationship>> {
        const r = await super.retrieveRaw(this.retrieveStatement(id))
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(MetatypeRelationship, r.value)))
    }

    public async Update(userID:string, m: MetatypeRelationship, transaction?: PoolClient): Promise<Result<MetatypeRelationship>> {
        const r = await super.runRaw(this.fullUpdateStatement(userID, m), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        const results = plainToClass(MetatypeRelationship, r.value)

        return Promise.resolve(Result.Success(results[0]))
    }

    public async BulkUpdate(userID:string, m: MetatypeRelationship[], transaction?: PoolClient): Promise<Result<MetatypeRelationship[]>> {
        const r = await super.runRaw(this.fullUpdateStatement(userID, ...m), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(MetatypeRelationship, r.value)))
    }

    public async PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(this.deleteStatement(id))
    }

    public async Archive(id: string, userID: string): Promise<Result<boolean>> {
        return super.run(this.archiveStatement(id, userID))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...relationships: MetatypeRelationship[]): string {
        const text = `INSERT INTO metatype_relationships(container_id, id,name,description,created_by,modified_by) VALUES %L RETURNING *`
        const values = relationships.map(r => [r.container_id, uuid.v4(), r.name, r.description, userID, userID])

        return format(text, values)
    }

    private retrieveStatement(relationshipID:string): QueryConfig {
        return {
            text:`SELECT * FROM metatype_relationships WHERE id = $1 AND NOT ARCHIVED`,
            values: [relationshipID]
        }
    }

    private archiveStatement(relationshipID: string, userID: string): QueryConfig {
        return {
            text:`UPDATE metatype_relationships SET archived = true, modified_by = $2  WHERE id = $1`,
            values: [relationshipID, userID]
        }
    }

    private deleteStatement(relationshipID: string): QueryConfig {
        return {
            text:`DELETE FROM metatype_relationships WHERE id = $1`,
            values: [relationshipID]
        }
    }

    private fullUpdateStatement(userID: string, ...relationships: MetatypeRelationship[]): string{
        const text = `UPDATE metatype_relationships AS m SET
                        name = u.name,
                        description = u.description,
                        modified_by = u.modified_by,
                        modified_at = NOW()
                      FROM(VALUES %L) AS u(id, name, description, modified_by)
                      WHERE u.id::uuid = m.id RETURNING m.*`
        const values = relationships.map(r=> [r.id, r.name, r.description, userID])

        return format(text, values)
    }
}
