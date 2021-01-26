import {MetatypeT, metatypesT, MetatypesT} from "../types/metatypeT"
import Result from "../result"
import PostgresStorage from "./postgresStorage";
import {QueryConfig} from "pg";
import * as t from "io-ts";
import PostgresAdapter from "./adapters/postgres/postgres";
import Logger from "../logger"
import Cache from "../services/cache/cache"
import Config from "../config"
import MetatypeKeyStorage from "./metatype_key_storage";

/*
* MetatypeStorage encompasses all logic dealing with the manipulation of the Metatype
* class in a data storage layer. In this case, the storage class requires a graph
* storage interface.
*/
export default class MetatypeStorage extends PostgresStorage{
    public static tableName = "metatypes";

    private static instance: MetatypeStorage;

    public static get Instance(): MetatypeStorage {
        if(!MetatypeStorage.instance) {
            MetatypeStorage.instance = new MetatypeStorage()
        }

        return MetatypeStorage.instance
    }

    public async Create(containerID: string, userID:string, input:any | MetatypesT): Promise<Result<MetatypesT>> {
        const onValidateSuccess = ( resolve: (r:any) => void): (c: MetatypesT)=> void => {
            return async (ms:MetatypesT) => {
                const queries: QueryConfig[] = [];

                for(const i in ms) {
                    ms[i].container_id = containerID;
                    ms[i].id = super.generateUUID();
                    ms[i].created_by = userID;
                    ms[i].modified_by = userID;

                    queries.push(MetatypeStorage.createStatement(ms[i]))
                }

                super.runAsTransaction(...queries)
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(ms))
                    })
            }
        };

        // allows us to accept an array of input if needed
        const payload = (t.array(t.unknown).is(input)) ? input : [input];

        return super.decodeAndValidate<MetatypesT>(metatypesT, onValidateSuccess, payload)
    }


    public async Retrieve(id: string): Promise<Result<MetatypeT>> {
        const cached = await Cache.get<MetatypeT>(`${MetatypeStorage.tableName}:${id}`)
        if(cached) {
            return new Promise(resolve => resolve(Result.Success(cached)))
        }

        const retrieved = await super.retrieve<MetatypeT>(MetatypeStorage.retrieveStatement(id))

        if(!retrieved.isError) {
            // don't fail out on cache set failure, log and move on
            Cache.set(`${MetatypeStorage.tableName}:${id}`, retrieved.value, Config.cache_default_ttl)
                .then(set => {
                    if(!set) Logger.error(`unable to insert metatype ${id} into cache`)
                })
        }

        return new Promise(resolve => resolve(retrieved))
    }

   public List(containerID: string, offset: number, limit:number, name?:string): Promise<Result<MetatypeT[]>> {
        if(name){
            return super.rows<MetatypeT>(MetatypeStorage.searchStatement(containerID, name))
        }

        return super.rows<MetatypeT>(MetatypeStorage.listStatement(containerID, offset, limit))
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
                    Cache.del(`${MetatypeStorage.tableName}:${id}`)
                        .then(set => {
                            if(!set) Logger.error(`unable to remove metatype ${id} from cache`)
                        })

                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    // BatchUpdate accepts multiple metatype payloads for full update
    public async BatchUpdate(input:any | MetatypesT): Promise<Result<MetatypesT>> {
        const onSuccess = ( resolve: (r:any) => void): (c: MetatypesT)=> void => {
            return async (ms:MetatypesT) => {
                const queries: QueryConfig[] = [];

                for(const i in ms) {
                    queries.push(MetatypeStorage.fullUpdateStatement(ms[i]))

                    Cache.del(`${MetatypeStorage.tableName}:${ms[i]}`)
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

                        resolve(Result.Success(ms))
                    })
            }
        };

        // allows us to accept an array of input if needed
        const payload = (t.array(t.unknown).is(input)) ? input : [input];

        return super.decodeAndValidate<MetatypesT>(metatypesT, onSuccess, payload)
    }

    public async PermanentlyDelete(id: string): Promise<Result<boolean>> {
        const toDelete = await this.Retrieve(id);

        if(!toDelete.isError) {
            Cache.del(`${MetatypeStorage.tableName}:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${toDelete.value.id} from cache`)
                })

            // needs to remove the key listing response as well
            Cache.del(`${MetatypeKeyStorage.tableName}:metatypeID:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${toDelete.value.id}'s keys from cache`)
                })
        }


        return super.run(MetatypeStorage.deleteStatement(id))
    }

    public async Archive(id: string, userID: string): Promise<Result<boolean>> {
        const toDelete = await this.Retrieve(id);

        if(!toDelete.isError) {
            Cache.del(`${MetatypeStorage.tableName}:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${toDelete.value.id} from cache`)
                })

            // needs to remove the key listing response as well
            Cache.del(`${MetatypeKeyStorage.tableName}:metatypeID:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${toDelete.value.id}'s keys from cache`)
                })
        }

        return super.run(MetatypeStorage.archiveStatement(id, userID))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(metatype: MetatypeT): QueryConfig {
        return {
            text:`INSERT INTO metatypes(container_id, id,name,description, created_by, modified_by) VALUES($1, $2, $3, $4, $5, $6)`,
            values: [metatype.container_id, metatype.id, metatype.name, metatype.description, metatype.created_by, metatype.modified_by]
        }
    }

    private static retrieveStatement(metatypeID:string): QueryConfig {
        return {
            text:`SELECT * FROM metatypes WHERE id = $1 AND NOT archived`,
            values: [metatypeID]
        }
    }

    private static archiveStatement(metatypeID: string, userID: string): QueryConfig {
        return {
            text:`UPDATE metatypes SET archived = true, modified_by = $2  WHERE id = $1`,
            values: [metatypeID, userID]
        }
    }

    private static deleteStatement(metatypeID: string): QueryConfig {
        return {
            text:`DELETE FROM metatypes WHERE id = $1`,
            values: [metatypeID]
        }
    }

    private static listStatement(containerID:string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM metatypes WHERE container_id = $1 AND NOT archived OFFSET $2 LIMIT $3`,
            values: [containerID, offset, limit]
        }
    }

    private static searchStatement(containerID: string, name: string): QueryConfig {
        return {
            text: `SELECT * FROM metatypes WHERE container_id = $1 AND NOT archived AND name LIKE '%${name}%'`,
            values: [containerID],
        }
    }

    private static fullUpdateStatement(metatype: MetatypeT): QueryConfig {
        return {
            text:`UPDATE metatypes SET name = $1, description = $2 WHERE id = $3`,
            values: [metatype.name, metatype.description, metatype.id]
        }
    }
}
