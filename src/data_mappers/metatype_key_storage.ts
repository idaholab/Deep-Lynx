import Result from "../result"
import {metatypeKeysT, MetatypeKeysT, MetatypeKeyT} from "../types/metatype_keyT";
import PostgresStorage from "./postgresStorage";
import {QueryConfig} from "pg";
import * as t from "io-ts";
import PostgresAdapter from "./adapters/postgres/postgres";
import Logger from "../logger"
import Cache from "../services/cache/cache"
import Config from "../config"

/*
* MetatypeKeyStorage encompasses all logic dealing with the manipulation of the
* MetatypeKey class in a data storage layer.
*/
export default class MetatypeKeyStorage extends PostgresStorage{
    public static tableName = "metatype_keys";

    private static instance: MetatypeKeyStorage;

    public static get Instance(): MetatypeKeyStorage {
        if(!MetatypeKeyStorage.instance) {
            MetatypeKeyStorage.instance = new MetatypeKeyStorage()
        }

        return MetatypeKeyStorage.instance
    }

    // Create accepts a single object, or array of objects. The function will
    // validate if those objects are a valid type and will return a detailed
    // error message if not
    public async Create(metatypeID: string, userID:string, input:any | MetatypeKeysT): Promise<Result<MetatypeKeysT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the MetatypeKey(s) type
        const onSuccess = ( resolve: (r:any) => void): (c: MetatypeKeysT)=> void => {
            return async (ms:MetatypeKeysT) => {
                const queries: QueryConfig[] = [];

                for(const i in ms) {
                    ms[i].metatype_id = metatypeID;
                    ms[i].id = super.generateUUID();
                    ms[i].created_by = userID;
                    ms[i].modified_by = userID;

                    queries.push(MetatypeKeyStorage.createStatement(ms[i]))


                    // need to clear the cache for its parent metatype
                    // an error but don't fail
                    Cache.del(`${MetatypeKeyStorage.tableName}:metatypeID:${ms[i].metatype_id}`)
                        .then(deleted => {
                            if(!deleted) Logger.error(`unable to clear cache for metatype ${ms[i].metatype_id}'s keys`)
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

        return super.decodeAndValidate<MetatypeKeysT>(metatypeKeysT, onSuccess, payload)
    }

    public async Retrieve(id: string): Promise<Result<MetatypeKeyT>> {
        const cached = await Cache.get<MetatypeKeyT>(`${MetatypeKeyStorage.tableName}:${id}`)
        if(cached) {
            return new Promise(resolve => resolve(Result.Success(cached)))
        }

        const retrieved = await super.retrieve<MetatypeKeyT>(MetatypeKeyStorage.retrieveStatement(id))

        if(!retrieved.isError) {
            // don't fail out on cache set failure, log and move on
            Cache.set(`${MetatypeKeyStorage.tableName}:${id}`, retrieved.value, Config.cache_default_ttl)
                .then(set => {
                    if(!set) Logger.error(`unable to insert metatype key ${id} into cache`)
                })
        }

        return new Promise(resolve => resolve(retrieved))
    }

    public async List(metatypeID: string): Promise<Result<MetatypeKeyT[]>> {
        const cached = await Cache.get<MetatypeKeyT[]>(`${MetatypeKeyStorage.tableName}:metatypeID:${metatypeID}`)
        if(cached) {
            return new Promise(resolve => resolve(Result.Success(cached)))
        }

        const retrieved = await super.rows<MetatypeKeyT>(MetatypeKeyStorage.listStatement(metatypeID))

        if(!retrieved.isError) {
            // don't fail out on cache set failure, log and move on
            Cache.set(`${MetatypeKeyStorage.tableName}:metatypeID:${metatypeID}`, retrieved.value, Config.cache_default_ttl)
                .then(set => {
                    if(!set) Logger.error(`unable to insert metatype keys for metatype ${metatypeID} into cache`)
                })
        }

        return new Promise(resolve => resolve(retrieved))
    }

    // Update partially updates the MetatypeKey. This function will allow you to
    // rewrite foreign keys - this is by design. The storage layer is dumb, whatever
    // uses the storage layer should be what enforces user privileges etc.
    public async Update(id: string, userID:string, updatedField: {[key:string]: any}): Promise<Result<boolean>> {
        const toUpdate = await this.Retrieve(id);

        if(toUpdate.isError) {
            return new Promise(resolve => resolve(Result.Failure(toUpdate.error!.error)))
        }

        const updateStatement:string[] = [];
        const values:string[] = [];
        let i = 1;

        Object.keys(updatedField).map(k => {
           if(k === `created_at` || k === `created_by` || k === 'modified_at' || k === 'modified_by') {
               return
           }

           // we must stringify the default value as it could be something other
           // than a string, we store it as a string in the DB for ease of use
           if(k === 'default_value' || k === 'options') {
               updateStatement.push(`${k} = $${i}`);
               values.push(JSON.stringify(updatedField[k]));
               i++
               return
           }

           updateStatement.push(`${k} = $${i}`);
           values.push(updatedField[k]);
           i++
        });

        updateStatement.push(`modified_by = $${i}`);
        values.push(userID);

        updateStatement.push('modified_at = NOW()')

        return new Promise(resolve => {
            PostgresAdapter.Instance.Pool.query({
                text: `UPDATE metatype_keys SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    // need to clear the cache for its parent metatype
                    Cache.del(`${MetatypeKeyStorage.tableName}:metatypeID:${toUpdate.value.metatype_id}`)
                        .then(deleted => {
                            if(!deleted) Logger.error(`unable to clear cache for metatype ${toUpdate.value.metatype_id}'s keys`)
                        })

                    Cache.del(`${MetatypeKeyStorage.tableName}:${id}`)
                        .then(deleted => {
                            if(!deleted) Logger.error(`unable to clear cache for metatype key ${id}`)
                        })

                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    // BatchUpdate accepts multiple MetatypeKey(s) payloads for full update
    public async BatchUpdate(input:any | MetatypeKeysT, userID: string): Promise<Result<MetatypeKeysT>> {
        const onValidateSuccess = ( resolve: (r:any) => void): (c: MetatypeKeysT)=> void => {
            return async (ms:MetatypeKeysT) => {
                const queries: QueryConfig[] = [];

                for(const i in ms) {
                    ms[i].modified_by = userID;

                    queries.push(MetatypeKeyStorage.fullUpdateStatement(ms[i]))

                    // need to clear the cache for its parent metatype
                    Cache.del(`${MetatypeKeyStorage.tableName}:metatypeID:${ms[i].metatype_id}`)
                        .then(deleted => {
                            if(!deleted) Logger.error(`unable to clear cache for metatype ${ms[i].metatype_id}'s keys`)
                        })

                    Cache.del(`${MetatypeKeyStorage.tableName}:${ms[i].id}`)
                        .then(deleted => {
                            if(!deleted) Logger.error(`unable to clear cache for metatype key ${ms[i].id}`)
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

        return super.decodeAndValidate<MetatypeKeysT>(metatypeKeysT, onValidateSuccess, payload)
    }

    public async PermanentlyDelete(id: string): Promise<Result<boolean>> {
        const toDelete = await this.Retrieve(id);

        if(!toDelete.isError) {
            // need to clear the cache for its parent metatype
            Cache.del(`${MetatypeKeyStorage.tableName}:metatypeID:${toDelete.value.metatype_id}`)
                .then(deleted => {
                    if(!deleted) Logger.error(`unable to clear cache for metatype ${toDelete.value.metatype_id}'s keys`)
                })

            Cache.del(`${MetatypeKeyStorage.tableName}:${id}`)
                .then(deleted => {
                    if(!deleted) Logger.error(`unable to clear cache for metatype key ${id}`)
                })
        }

        return super.run(MetatypeKeyStorage.deleteStatement(id))
    }

    public async Archive(id: string, userID: string): Promise<Result<boolean>> {
        const toDelete = await this.Retrieve(id);

        if(!toDelete.isError) {
            // need to clear the cache for its parent metatype
            Cache.del(`${MetatypeKeyStorage.tableName}:metatypeID:${toDelete.value.metatype_id}`)
                .then(deleted => {
                    if(!deleted) Logger.error(`unable to clear cache for metatype ${toDelete.value.metatype_id}'s keys`)
                })

            Cache.del(`${MetatypeKeyStorage.tableName}:${id}`)
                .then(deleted => {
                    if(!deleted) Logger.error(`unable to clear cache for metatype key ${id}`)
                })
        }

        return super.run(MetatypeKeyStorage.archiveStatement(id, userID))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(key: MetatypeKeyT): QueryConfig {
        return {
            text:`
INSERT INTO
metatype_keys(metatype_id, id, name, description, property_name, required, data_type, options, default_value, validation, created_by, modified_by)
VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            values: [key.metatype_id, key.id, key.name, key.description,
                key.property_name, key.required, key.data_type, JSON.stringify(key.options),
                JSON.stringify(key.default_value), key.validation, key.created_by, key.modified_by]
        }
    }

    private static retrieveStatement(metatypeKeyID:string): QueryConfig {
        return {
            text:`SELECT * FROM metatype_keys WHERE id = $1 AND NOT ARCHIVED`,
            values: [metatypeKeyID]
        }
    }

    private static archiveStatement(metatypeKeyID: string, userID: string): QueryConfig {
        return {
            text:`UPDATE metatype_keys SET archived = true, modified_by = $2  WHERE id = $1`,
            values: [metatypeKeyID, userID]
        }
    }

    private static deleteStatement(metatypeKeyID: string): QueryConfig {
        return {
            text:`DELETE FROM metatype_keys WHERE id = $1`,
            values: [metatypeKeyID]
        }
    }

    private static listStatement(metatypeID:string): QueryConfig {
        return {
            text: `SELECT * FROM metatype_keys WHERE metatype_id = $1 AND NOT archived`,
            values: [metatypeID]
        }
    }

    private static fullUpdateStatement(key: MetatypeKeyT): QueryConfig {
        return {
            text:`UPDATE metatype_keys SET name = $1,
                 description = $2,
                 property_name = $3,
                 required = $4,
                 data_type = $5,
                 options = $6,
                 default_value = $7,
                 validation = $8
                 WHERE id = $9`,
            values: [key.name, key.description,
                key.property_name, key.required, key.data_type, JSON.stringify(key.options),
                JSON.stringify(key.default_value),key.validation, key.id]
        }
    }
}
