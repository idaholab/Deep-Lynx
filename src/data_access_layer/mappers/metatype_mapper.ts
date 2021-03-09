import Result from "../../result"
import PostgresStorage from "./postgresStorage";
import {PoolClient, QueryConfig} from "pg";
import Logger from "../../logger"
import Cache from "../../services/cache/cache"
import MetatypeKeyMapper from "./metatype_key_storage";
import Metatype from "../../data_warehouse/ontology/metatype";
import uuid from "uuid";
import {plainToClass} from "class-transformer";
const format = require('pg-format')

/*
* MetatypeMapper encompasses all logic dealing with the manipulation of the Metatype
* class in a data storage layer.
*/
export default class MetatypeMapper extends PostgresStorage{
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
        const r = await super.runRaw(this.bulkCreateStatement(userID, m), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(Metatype, r.value)))
    }

    public async Retrieve(id: string): Promise<Result<Metatype>> {
        const result = await super.retrieveRaw(this.retrieveStatement(id))

        if(result.isError) return Promise.resolve(Result.Pass(result))
        return Promise.resolve(Result.Success(plainToClass(Metatype, result.value)))
    }

    public async List(containerID: string, offset: number, limit:number, name?:string): Promise<Result<Metatype[]>> {
        const returns: object[] = []
        if(name){
            const results = await super.rowsRaw(this.searchStatement(containerID, name))
            if(results.isError) return Promise.resolve(Result.Pass(results))

            returns.push(...results.value)
        } else if(limit === -1) {
            const results = await super.rowsRaw(this.listAllStatement(containerID))
            if(results.isError) return Promise.resolve(Result.Pass(results))

            returns.push(...results.value)
        } else {
            const results = await super.rowsRaw(this.listStatement(containerID, offset, limit))
            if(results.isError) return Promise.resolve(Result.Pass(results))

            returns.push(...results.value)
        }

        return Promise.resolve(Result.Success(plainToClass(Metatype, returns)))
    }

    public async Update(userID:string, m: Metatype, transaction?: PoolClient): Promise<Result<Metatype>> {
        const r = await super.runRaw(this.fullUpdateStatement(m, userID), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        const resultMetatypes = plainToClass(Metatype, r.value)

        return Promise.resolve(Result.Success(resultMetatypes[0]))
    }

    public async BulkUpdate(userID:string, m: Metatype[], transaction?: PoolClient): Promise<Result<Metatype[]>> {
        const r = await super.runRaw(this.fullBulkUpdateStatement(m, userID), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(Metatype, r.value)))
    }

    public async PermanentlyDelete(id: string): Promise<Result<boolean>> {
        const toDelete = await this.Retrieve(id);

        if(!toDelete.isError) {
            Cache.del(`${MetatypeMapper.tableName}:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${toDelete.value.id} from cache`)
                })

            // needs to remove the key listing response as well
            Cache.del(`${MetatypeKeyMapper.tableName}:metatypeID:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${toDelete.value.id}'s keys from cache`)
                })
        }


        return super.run(this.deleteStatement(id))
    }

    public async Archive(id: string, userID: string): Promise<Result<boolean>> {
        const toDelete = await this.Retrieve(id);

        if(!toDelete.isError) {
            Cache.del(`${MetatypeMapper.tableName}:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${toDelete.value.id} from cache`)
                })

            // needs to remove the key listing response as well
            Cache.del(`${MetatypeKeyMapper.tableName}:metatypeID:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${toDelete.value.id}'s keys from cache`)
                })
        }

        return super.run(this.archiveStatement(id, userID))
    }

    public async Count(containerID: string): Promise<Result<number>> {
        return super.count(this.countStatement(containerID))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, metatype: Metatype): QueryConfig {
        return {
            text:`INSERT INTO metatypes(container_id, id,name,description, created_by, modified_by) VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
            values: [metatype.container_id, uuid.v4(), metatype.name, metatype.description, userID, userID]
        }
    }


    private bulkCreateStatement(userID: string, metatypes: Metatype[]): QueryConfig {
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

    private listStatement(containerID:string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM metatypes WHERE container_id = $1 AND NOT archived OFFSET $2 LIMIT $3`,
            values: [containerID, offset, limit]
        }
    }

    private listAllStatement(containerID:string): QueryConfig {
        return {
            text: `SELECT * FROM metatypes WHERE container_id = $1 AND NOT archived`,
            values: [containerID]
        }
    }

    private searchStatement(containerID: string, name: string): QueryConfig {
        return {
            text: `SELECT * FROM metatypes WHERE container_id = $1 AND NOT archived AND name LIKE '%${name}%'`,
            values: [containerID],
        }
    }

    private fullUpdateStatement(metatype: Metatype, userID: string): QueryConfig {
        return {
            text:`UPDATE metatypes SET name = $1, description = $2, modified_by = $3, modified_at = NOW() WHERE id = $4 RETURNING *`,
            values: [metatype.name, metatype.description, userID, metatype.id]
        }
    }

    private fullBulkUpdateStatement(metatypes: Metatype[], userID: string): string{
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

    private countStatement(containerID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM metatypes WHERE NOT archived AND container_id = $1`,
            values: [containerID]
        }
    }
}
