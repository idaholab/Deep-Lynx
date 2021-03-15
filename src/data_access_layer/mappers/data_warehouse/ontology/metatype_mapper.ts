import Result from "../../../../result"
import Mapper from "../../mapper";
import {PoolClient, QueryConfig} from "pg";
import Metatype from "../../../../data_warehouse/ontology/metatype";
import uuid from "uuid";
import {plainToClass} from "class-transformer";
const format = require('pg-format')

/*
* MetatypeMapper encompasses all logic dealing with the manipulation of the Metatype
* class in a data storage layer.
*/
export default class MetatypeMapper extends Mapper{
    public static tableName = "metatypes";

    private static instance: MetatypeMapper;

    public static get Instance(): MetatypeMapper {
        if(!MetatypeMapper.instance) {
            MetatypeMapper.instance = new MetatypeMapper()
        }

        return MetatypeMapper.instance
    }

    public async Create(userID:string, input: Metatype, transaction?: PoolClient): Promise<Result<Metatype>> {
        const r = await super.runRaw(this.createStatement(userID, input), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        const resultMetatypes = plainToClass(Metatype, r.value)

        return Promise.resolve(Result.Success(resultMetatypes[0]))
    }

    public async BulkCreate(userID: string, m: Metatype[], transaction?: PoolClient): Promise<Result<Metatype[]>> {
        const r = await super.runRaw(this.createStatement(userID, ...m), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(Metatype, r.value)))
    }

    public async Retrieve(id: string): Promise<Result<Metatype>> {
        const r = await super.retrieveRaw(this.retrieveStatement(id))
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(Metatype, r.value)))
    }

    public async Update(userID: string, m: Metatype, transaction?: PoolClient): Promise<Result<Metatype>> {
        const r = await super.runRaw(this.fullUpdateStatement(userID, m), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        const resultMetatypes = plainToClass(Metatype, r.value)

        return Promise.resolve(Result.Success(resultMetatypes[0]))
    }

    public async BulkUpdate(userID: string, m: Metatype[], transaction?: PoolClient): Promise<Result<Metatype[]>> {
        const r = await super.runRaw(this.fullUpdateStatement(userID, ...m), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(Metatype, r.value)))
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
    private createStatement(userID: string, ...metatypes: Metatype[]): string {
        const text= `INSERT INTO metatypes(container_id, id,name,description, created_by, modified_by) VALUES %L RETURNING *`
        const values = metatypes.map(metatype => [metatype.container_id, uuid.v4(), metatype.name, metatype.description, userID, userID])

        return format(text, values)
    }

    private retrieveStatement(metatypeID:string): QueryConfig {
        return {
            text:`SELECT * FROM metatypes WHERE id = $1 AND NOT archived`,
            values: [metatypeID]
        }
    }

    private archiveStatement(metatypeID: string, userID: string): QueryConfig {
        return {
            text:`UPDATE metatypes SET archived = true, modified_by = $2  WHERE id = $1`,
            values: [metatypeID, userID]
        }
    }

    private deleteStatement(metatypeID: string): QueryConfig {
        return {
            text:`DELETE FROM metatypes WHERE id = $1`,
            values: [metatypeID]
        }
    }

    private fullUpdateStatement(userID: string, ...metatypes: Metatype[]): string{
        const text = `UPDATE metatypes AS m SET
                        name = u.name,
                        description = u.description,
                        modified_by = u.modified_by,
                        modified_at = NOW()
                      FROM(VALUES %L) AS u(id, name, description, modified_by)
                      WHERE u.id::uuid = m.id RETURNING *`
        const values = metatypes.map(metatype=> [metatype.id, metatype.name, metatype.description, userID])

        return format(text, values)
    }
}
