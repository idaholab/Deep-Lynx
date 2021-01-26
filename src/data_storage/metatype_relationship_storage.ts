import {MetatypeT, metatypesT, MetatypesT} from "../types/metatypeT"
import Result from "../result"
import PostgresStorage from "./postgresStorage";
import {QueryConfig} from "pg";
import * as t from "io-ts";
import PostgresAdapter from "./adapters/postgres/postgres";
import {MetatypeRelationshipT, MetatypeRelationshipsT} from "../types/metatype_relationshipT";
import Logger from "../logger"
import Cache from "../services/cache/cache"
import Config from "../config"
import MetatypeRelationshipKeyStorage from "./metatype_relationship_key_storage";

/*
* MetatypeRelationship Storage encompasses all logic dealing with the manipulation
* MetatypeRelationships in the Postgres storage solution
*/
export default class MetatypeRelationshipStorage extends PostgresStorage{
    public static tableName = "metatype_relationships";

    private static instance: MetatypeRelationshipStorage;

    public static get Instance(): MetatypeRelationshipStorage {
        if(!MetatypeRelationshipStorage.instance) {
            MetatypeRelationshipStorage.instance = new MetatypeRelationshipStorage()
        }

        return MetatypeRelationshipStorage.instance
    }

    // Create accepts a single object, or array of objects. The function will validate
    // if those objects are a valid type and will return a detailed error message
    // if not
    public async Create(containerID: string, userID:string, input:any | MetatypeRelationshipsT): Promise<Result<MetatypeRelationshipsT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the MetatypeRelationship(s) type
        const onValidateSuccess = ( resolve: (r:any) => void): (c: MetatypeRelationshipsT)=> void => {
            return async (ms:MetatypeRelationshipsT) => {
                const queries: QueryConfig[] = [];

                for(const i in ms) {
                    ms[i].container_id = containerID;
                    ms[i].id = super.generateUUID();
                    ms[i].created_by = userID;
                    ms[i].modified_by = userID;


                    queries.push(MetatypeRelationshipStorage.createStatement(ms[i]))
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


    public async Retrieve(id: string): Promise<Result<MetatypeRelationshipT>> {
        const cached = await Cache.get<MetatypeRelationshipT>(`${MetatypeRelationshipStorage.tableName}:${id}`)
        if(cached) {
            return new Promise(resolve => resolve(Result.Success(cached)))
        }

        const retrieved = await super.retrieve<MetatypeT>(MetatypeRelationshipStorage.retrieveStatement(id))

        if(!retrieved.isError) {
            // don't fail out on cache set failure, log and move on
            Cache.set(`${MetatypeRelationshipStorage.tableName}:${id}`, retrieved.value, Config.cache_default_ttl)
                .then(set => {
                    if(!set) Logger.error(`unable to insert metatype relationship ${id} into cache`)
                })
        }

        return new Promise(resolve => resolve(retrieved))
    }

   public List(containerID: string, offset: number, limit:number): Promise<Result<MetatypeRelationshipT[]>> {
        return super.rows<MetatypeT>(MetatypeRelationshipStorage.listStatement(containerID, offset, limit))
   }

    // Update partially updates the MetatypeRelationship. This function will allow you to
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
            updateStatement.push(`${k} = $${i}`);
            values.push(updatedField[k]);
            i++
        });

        updateStatement.push(`modified_by = $${i}`);
        values.push(userID);

        return new Promise(resolve => {
            PostgresAdapter.Instance.Pool.query({
                text: `UPDATE metatype_relationships SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    Cache.del(`${MetatypeRelationshipStorage.tableName}:${id}`)
                        .then(set => {
                            if(!set) Logger.error(`unable to remove metatype relationship ${id} from cache`)
                        })

                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    // BatchUpdate accepts multiple MetatypeRelationship(s) payloads for full update
    public async BatchUpdate(input:any | MetatypeRelationshipsT): Promise<Result<MetatypeRelationshipsT>> {
        // Again, this callback runs after the payload is verified.
        const onValidateSuccess = ( resolve: (r:any) => void): (c: MetatypesT)=> void => {
            return async (ms:MetatypesT) => {
                const queries: QueryConfig[] = [];

                for(const i in ms) {
                    queries.push(MetatypeRelationshipStorage.fullUpdateStatement(ms[i]))

                    Cache.del(`${MetatypeRelationshipStorage.tableName}:${ms[i].id}`)
                        .then(set => {
                            if(!set) Logger.error(`unable to remove metatype relationship ${ms[i].id} from cache`)
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

        return super.decodeAndValidate<MetatypesT>(metatypesT, onValidateSuccess, payload)
    }

    public async PermanentlyDelete(id: string): Promise<Result<boolean>> {
        const toDelete = await this.Retrieve(id);

        if(!toDelete.isError) {
            Cache.del(`${MetatypeRelationshipStorage.tableName}:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${toDelete.value.id} from cache`)
                })

            // needs to remove the key listing response as well
            Cache.del(`${MetatypeRelationshipKeyStorage.tableName}:metatypeRelationshipID:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype relationship ${toDelete.value.id}'s keys from cache`)
                })
        }

        return super.run(MetatypeRelationshipStorage.deleteStatement(id))
    }

    public async Archive(id: string, userID: string): Promise<Result<boolean>> {
        const toDelete = await this.Retrieve(id);

        if(!toDelete.isError) {
            Cache.del(`${MetatypeRelationshipStorage.tableName}:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype ${toDelete.value.id} from cache`)
                })

            // needs to remove the key listing response as well
            Cache.del(`${MetatypeRelationshipKeyStorage.tableName}:metatypeRelationshipID:${toDelete.value.id}`)
                .then(set => {
                    if(!set) Logger.error(`unable to remove metatype relationship ${toDelete.value.id}'s keys from cache`)
                })
        }

        return super.run(MetatypeRelationshipStorage.archiveStatement(id, userID))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(metatype: MetatypeT): QueryConfig {
        return {
            text:`INSERT INTO metatype_relationships(container_id, id,name,description,created_by,modified_by) VALUES($1, $2, $3, $4, $5, $6)`,
            values: [metatype.container_id, metatype.id, metatype.name, metatype.description, metatype.created_by, metatype.modified_by]
        }
    }

    private static retrieveStatement(metatypeID:string): QueryConfig {
        return {
            text:`SELECT * FROM metatype_relationships WHERE id = $1 AND NOT ARCHIVED`,
            values: [metatypeID]
        }
    }

    private static archiveStatement(metatypeID: string, userID: string): QueryConfig {
        return {
            text:`UPDATE metatype_relationships SET archived = true, modified_by = $2  WHERE id = $1`,
            values: [metatypeID, userID]
        }
    }

    private static deleteStatement(metatypeID: string): QueryConfig {
        return {
            text:`DELETE FROM metatype_relationships WHERE id = $1`,
            values: [metatypeID]
        }
    }

    private static listStatement(containerID:string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM metatype_relationships WHERE container_id = $1 AND NOT archived OFFSET $2 LIMIT $3`,
            values: [containerID, offset, limit]
        }
    }

    private static fullUpdateStatement(metatype: MetatypeT): QueryConfig {
        return {
            text:`UPDATE metatype_relationships SET name = $1, description = $2 WHERE id = $3`,
            values: [metatype.name, metatype.description, metatype.id]
        }
    }
}
