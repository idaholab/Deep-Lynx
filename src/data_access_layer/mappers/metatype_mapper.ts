import {MetatypeT, metatypesT, MetatypesT} from "../../types/metatypeT"
import Result from "../../result"
import PostgresStorage from "./postgresStorage";
import {PoolClient, QueryConfig} from "pg";
import * as t from "io-ts";
import PostgresAdapter from "./adapters/postgres/postgres";
import Logger from "../../logger"
import Cache from "../../services/cache/cache"
import MetatypeKeyStorage from "./metatype_key_storage";
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

    public async Create(containerID: string, userID:string, input: Metatype, transaction?: PoolClient): Promise<Result<Metatype>> {
        const r = await super.runRaw(this.createStatement(containerID, userID, input), transaction)
        if(r.isError) {
            return Promise.resolve(Result.Pass(r))
        }

        const resultMetatypes = plainToClass(Metatype, r.value)

        return Promise.resolve(Result.Success(resultMetatypes[0]))
    }

    public async BulkCreate(containerID: string, userID: string, m: Metatype[], transacation?: PoolClient): Promise<Result<Metatype[]>> {
        const r = await super.runRaw(this.bulkCreateStatement(containerID, userID, m), transacation)
        if(r.isError) {
            return Promise.resolve(Result.Pass(r))
        }

        const resultMetatypes = plainToClass(Metatype, r.value)

        return Promise.resolve(Result.Success(resultMetatypes))
    }

    public async Retrieve(id: string): Promise<Result<Metatype>> {
        const result = await super.retrieveRaw(this.retrieveStatement(id))

        if(result.isError) return Promise.resolve(Result.Pass(result))
        return Promise.resolve(Result.Success(plainToClass(Metatype, result.value)))
    }

    public List(containerID: string, offset: number, limit:number, name?:string): Promise<Result<MetatypeT[]>> {
        if(name){
            return super.rows<MetatypeT>(this.searchStatement(containerID, name))
        }

        if(limit === -1) {
            return super.rows<MetatypeT>(this.listAllStatement(containerID))
        }

        return super.rows<MetatypeT>(this.listStatement(containerID, offset, limit))
    }

    public async Update(id: string, userID:string, updatedField: {[key:string]: any}): Promise<Result<boolean>> {
        const toUpdate = await this.Retrieve(id);

        if(toUpdate.isError) {
            return new Promise(resolve => resolve(Result.Failure(toUpdate.error!.error)))
        }

        const updateStatement:string[] = [];
        const values:string[] = [];
        let i = 1;

        Object.keys(updatedField).map(k => {
            updateStatement.push(`${k} = $${i}`);
            values.push(updatedField[k]);
            i++
        });

        updateStatement.push(`modified_by = $${i}`);
        values.push(userID);

        return new Promise(resolve => {
            PostgresAdapter.Instance.Pool.query({
                text: `UPDATE metatypes SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    Cache.del(`${MetatypeMapper.tableName}:${id}`)
                        .then(set => {
                            if(!set) Logger.error(`unable to remove metatype ${id} from cache`)
                        })

                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    // BatchUpdate accepts multiple metatype payloads for full update
    public async BatchUpdate(input:any | MetatypesT): Promise<Result<Metatype[]>> {
        const onSuccess = ( resolve: (r:any) => void): (c: Metatype[])=> void => {
            return async (ms:MetatypesT) => {
                const queries: QueryConfig[] = [];

                for(const i in ms) {
                    queries.push(this.fullUpdateStatement(ms[i]))

                    Cache.del(`${MetatypeMapper.tableName}:${ms[i]}`)
                        .then(set => {
                            if(!set) Logger.error(`unable to remove metatype ${ms[i].id} from cache`)
                        })
                }

                super.runAsTransaction(...queries)
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(plainToClass(Metatype, ms)))
                    })
            }
        };

        // allows us to accept an array of input if needed
        const payload = (t.array(t.unknown).is(input)) ? input : [input];

        return super.decodeAndValidate<Metatype[]>(metatypesT, onSuccess, payload)
    }

    public async PermanentlyDelete(id: string): Promise<Result<boolean>> {
        const toDelete = await this.Retrieve(id);

        if(!toDelete.isError) {
            Cache.del(`${MetatypeMapper.tableName}:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${toDelete.value.id} from cache`)
                })

            // needs to remove the key listing response as well
            Cache.del(`${MetatypeKeyStorage.tableName}:metatypeID:${toDelete.value.id}`)
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
            Cache.del(`${MetatypeKeyStorage.tableName}:metatypeID:${toDelete.value.id}`)
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
    private createStatement(containerID: string, userID: string, metatype: Metatype): QueryConfig {
        return {
            text:`INSERT INTO metatypes(container_id, id,name,description, created_by, modified_by) VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
            values: [containerID, uuid.v4(), metatype.name, metatype.description, userID, userID]
        }
    }


    private bulkCreateStatement(containerID: string, userID: string, metatypes: Metatype[]): QueryConfig {
        const text= `INSERT INTO metatypes(container_id, id,name,description, created_by, modified_by) VALUES %L RETURNING *`
        const values = metatypes.map(metatype => [containerID, uuid.v4(), metatype.name, metatype.description, userID, userID])

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

    private fullUpdateStatement(metatype: MetatypeT): QueryConfig {
        return {
            text:`UPDATE metatypes SET name = $1, description = $2 WHERE id = $3`,
            values: [metatype.name, metatype.description, metatype.id]
        }
    }

    private countStatement(containerID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM metatypes WHERE NOT archived AND container_id = $1`,
            values: [containerID]
        }
    }
}
