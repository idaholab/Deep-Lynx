import {ContainerT, ContainersT, containersT} from "../types/containerT"
import Result from "../result"
import PostgresStorage from "./postgresStorage";
import { QueryConfig} from "pg";
import * as t from "io-ts";
import PostgresAdapter from "./adapters/postgres/postgres";
import uuid from "uuid";
import GraphStorage from "./graph/graph_storage";
import Logger from "../logger";

/*
* ContainerStorage encompasses all logic dealing with the manipulation of the
* Container class in a data storage layer.
*/
export default class ContainerStorage extends PostgresStorage{
    public static tableName = "containers";

    private static instance: ContainerStorage;

    public static get Instance(): ContainerStorage {
        if(!ContainerStorage.instance) {
            ContainerStorage.instance = new ContainerStorage()
        }

        return ContainerStorage.instance
    }

    // Create accepts a single object, or array of objects. The function will validate
    // if those objects are a valid type and will return a detailed error message
    // if not.
    public async Create(userID:string, input:any | ContainersT, preQueries?:QueryConfig[], postQueries?:QueryConfig[]): Promise<Result<ContainersT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the Container(s) type
           const onValidateSuccess = ( resolve: (r:any) => void): (c: ContainersT)=> void => {
               return async (cs:ContainersT) => {
                   const queries: QueryConfig[] = [];

                   if(preQueries) queries.push(...preQueries);

                   for(const i in cs) {
                       cs[i].id = super.generateUUID();
                       cs[i].created_by = userID;
                       cs[i].modified_by = userID;

                       queries.push(...ContainerStorage.createStatement(cs[i]))
                   }

                   if (postQueries) queries.push(...postQueries);

                   super.runAsTransaction(...queries)
                       .then((r) => {
                          if(r.isError) {
                              resolve(r);
                              return
                          }

                          for(const i in cs) {
                            // create graph
                            GraphStorage.Instance.Create(cs[i].id!, userID).then(async (result) => {
                                // set active graph from graph ID
                                if (result.isError) {
                                    Logger.error(result.error?.error!);
                                } else {
                                    const activeGraph = await GraphStorage.Instance.SetActiveForContainer(cs[i].id!, result.value.id);
                                    if (activeGraph.isError || !activeGraph.value) {
                                        Logger.error(activeGraph.error?.error!);
                                    }
                                }
                            }).catch(e => Logger.error(e))
                          }

                          resolve(Result.Success(containersT.encode(cs)))
                       })
               }
           };

           // allows us to accept an array of input if needed
           const payload = (t.array(t.unknown).is(input)) ? input : [input];

           return super.decodeAndValidate<ContainersT>(containersT, onValidateSuccess, payload)
    }

    public async Retrieve(id:string): Promise<Result<ContainerT>>{
        return super.retrieve<ContainerT>(ContainerStorage.retrieveStatement(id))
    }

    // Update partially updates the Container. This function will allow you to
    // rewrite foreign keys - this is by design. The storage layer is dumb, whatever
    // uses the storage layer should be what enforces user privileges etc.
    public async Update(id: string, userID: string, updatedField: {[key:string]: any}): Promise<Result<boolean>> {
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
                text: `UPDATE containers SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    // BatchUpdate accepts multiple Container(s) payloads for full update
    public async BatchUpdate(userID:string, input:any | ContainersT): Promise<Result<ContainersT>> {
        // Again, this callback runs after the payload is verified.
        const onValidateSuccess = ( resolve: (r:any) => void): (c: ContainersT)=> void => {
            return async (cs:ContainersT) => {
                const queries: QueryConfig[] = [];

                for(const i in cs) {
                    cs[i].modified_by = userID;

                    queries.push(ContainerStorage.fullUpdateStatement(cs[i]))
                }

                super.runAsTransaction(...queries)
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(cs))
                    })
            }
        };

        // allows us to accept an array of input if needed
        const payload = (t.array(t.unknown).is(input)) ? input : [input];

        return super.decodeAndValidate<ContainersT>(containersT, onValidateSuccess, payload)
    }

    public async List(): Promise<Result<ContainerT[]>> {
        return super.rows<ContainerT>(ContainerStorage.listStatement())
    }

    public async ListFromIDS(ids: string[]): Promise<Result<ContainerT[]>> {
        return super.rows<ContainerT>(ContainerStorage.listFromIDsStatement(ids))
    }

    public async Archive(containerID: string, userID: string): Promise<Result<boolean>> {
       return super.run(ContainerStorage.archiveStatement(containerID, userID))
    }

    public async PermanentlyDelete(containerID: string): Promise<Result<boolean>> {
        return super.run(ContainerStorage.deleteStatement(containerID))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(container: ContainerT): QueryConfig[] {
        const graphID = uuid.v4();
        return [{
           text:`INSERT INTO containers(id,name,description, created_by, modified_by) VALUES($1, $2, $3, $4,$5)`,
           values: [container.id, container.name, container.description, container.created_by, container.modified_by]
            }
          ]
    }

    private static fullUpdateStatement(container: ContainerT): QueryConfig {
        return {
            text:`UPDATE containers SET name = $1, description = $2 WHERE id = $3`,
            values: [container.name, container.description, container.id]
        }
    }

    private static archiveStatement(containerID: string, userID: string): QueryConfig {
        return {
            text:`UPDATE containers SET archived = true, modified_by = $2  WHERE id = $1`,
            values: [containerID, userID]
        }
    }

    private static deleteStatement(containerID: string): QueryConfig {
        return {
            text:`DELETE FROM containers WHERE id = $1`,
            values: [containerID]
        }
    }

    private static retrieveStatement(id:string): QueryConfig {
        return {
            text:`SELECT * FROM containers WHERE id = $1 AND NOT ARCHIVED`,
            values: [id]
        }
    }

    private static listStatement(): QueryConfig {
        return {
            text: `SELECT * FROM containers WHERE NOT archived`,
        }
    }

    private static listFromIDsStatement(ids: string[]): QueryConfig {
        // have to add the quotations in order for postgres to treat the uuid correctly
        ids.map(id => `'${id}'`)

        return {
           text: `SELECT * FROM containers WHERE id IN($1)`,
           values: ids
       }
    }
}
