import Result from "../result"
import {
    MetatypeRelationshipPairT, metatypeRelationshipPairsT,
    MetatypeRelationshipPairsT
} from "../types/metatype_relationship_pairT";
import PostgresStorage from "./postgresStorage";
import {QueryConfig} from "pg";
import * as t from "io-ts";
import PostgresAdapter from "./adapters/postgres/postgres";

/*
* MetatypeRelationship Pair encompasses all logic dealing with the manipulation
* of a relationship pair between Metatypes
*/
export default class MetatypeRelationshipPairStorage extends PostgresStorage{
    public static tablename = "metatype_relationship_pairs";

    private static instance: MetatypeRelationshipPairStorage;

    public static get Instance(): MetatypeRelationshipPairStorage {
        if(!MetatypeRelationshipPairStorage.instance) {
            MetatypeRelationshipPairStorage.instance = new MetatypeRelationshipPairStorage()
        }

        return MetatypeRelationshipPairStorage.instance
    }

    // Create accepts a single object, or array of objects. The function will validate
    // if those objects are a valid type and will return a detailed error message
    // if not
    public async Create(containerID:string, userID:string, input:any | MetatypeRelationshipPairsT): Promise<Result<MetatypeRelationshipPairsT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the MetatypeRelationshipPair(s) type
        const onValidateSuccess = ( resolve: (r:any) => void): (p: MetatypeRelationshipPairsT)=> void => {
            return async (ps:MetatypeRelationshipPairsT) => {
                const queries: QueryConfig[] = [];

                for(const i in ps) {
                    ps[i].container_id = containerID;
                    ps[i].id = super.generateUUID();
                    ps[i].created_by = userID;
                    ps[i].modified_by = userID;


                    queries.push(MetatypeRelationshipPairStorage.createStatement(ps[i]))
                }

                super.runAsTransaction(...queries)
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(ps))
                    })
            }
        };

        // allows us to accept an array of input if needed
        const payload = (t.array(t.unknown).is(input)) ? input : [input];

        return super.decodeAndValidate<MetatypeRelationshipPairsT>(metatypeRelationshipPairsT, onValidateSuccess, payload)
    }

    public async Retrieve(id:string): Promise<Result<MetatypeRelationshipPairT>>{
        return super.retrieve<MetatypeRelationshipPairT>(MetatypeRelationshipPairStorage.retrieveStatement(id))
    }

    public async RetrieveByMetatypes(origin:string, destination:string): Promise<Result<MetatypeRelationshipPairT>> {
        return super.retrieve<MetatypeRelationshipPairT>(MetatypeRelationshipPairStorage.retrieveForDestinationAndOriginStatement(origin, destination))
    }

    public async RetrieveByMetatypesAndRelationship(origin:string, destination:string, relationship:string,): Promise<Result<MetatypeRelationshipPairT>> {
        return super.retrieve<MetatypeRelationshipPairT>(MetatypeRelationshipPairStorage.retrieveForDestinationAndOriginAndRelationshipStatement(origin, destination, relationship))
    }

    // Update partially updates the MetatypeRelationshipPair. This function will allow you to
    // rewrite foreign keys - this is by design. The storage layer is dumb, whatever
    // uses the storage layer should be what enforces user privileges etc.
    public async Update(id: string, updatedField: {[key:string]: any}): Promise<Result<boolean>> {
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


        return new Promise(resolve => {
            PostgresAdapter.Instance.Pool.query({
                text: `UPDATE metatype_relationship_pairs SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    // BatchUpdate accepts multiple container payloads for full update
    public async BatchUpdate(input:any | MetatypeRelationshipPairsT): Promise<Result<MetatypeRelationshipPairsT>> {
        // Again, this callback runs after the payload is verified.
        const onSuccess = ( resolve: (r:any) => void): (p: MetatypeRelationshipPairsT)=> void => {
            return async (ps:MetatypeRelationshipPairsT) => {
                const queries: QueryConfig[] = [];

                for(const i in ps) {
                    queries.push(MetatypeRelationshipPairStorage.fullUpdateStatement(ps[i]))
                }

                super.runAsTransaction(...queries)
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(ps))
                    })
            }
        };

        // allows us to accept an array of input if needed
        const payload = (t.array(t.unknown).is(input)) ? input : [input];

        return super.decodeAndValidate<MetatypeRelationshipPairsT>(metatypeRelationshipPairsT, onSuccess, payload)
    }

    public async List(containerID: string, offset: number, limit:number): Promise<Result<MetatypeRelationshipPairT[]>> {
        return super.rows<MetatypeRelationshipPairT>(MetatypeRelationshipPairStorage.listStatement(containerID, offset, limit))
    }

    public async ListByDestinationMetatype(id: string): Promise<Result<MetatypeRelationshipPairT[]>> {
        return super.rows<MetatypeRelationshipPairT>(MetatypeRelationshipPairStorage.retrieveForDestinationStatement(id))
    }

    public async ListByOriginMetatype(id: string): Promise<Result<MetatypeRelationshipPairT[]>> {
        return super.rows<MetatypeRelationshipPairT>(MetatypeRelationshipPairStorage.retrieveForOriginStatement(id))
    }

    public async Archive(pairID: string, userID: string): Promise<Result<boolean>> {
        return super.run(MetatypeRelationshipPairStorage.archiveStatement(pairID, userID))
    }

    public async Delete(pairID: string): Promise<Result<boolean>> {
        return super.run(MetatypeRelationshipPairStorage.deleteStatement(pairID))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(pair: MetatypeRelationshipPairT): QueryConfig {
        return {
            text:`
INSERT INTO
metatype_relationship_pairs(id,name,description,relationship_id, origin_metatype_id,destination_metatype_id, relationship_type, container_id, created_by, modified_by)
VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            values: [pair.id, pair.name,
                pair.description,
                pair.relationship_id,
                pair.origin_metatype_id,
                pair.destination_metatype_id,
                pair.relationship_type,
                pair.container_id,
                pair.created_by,
                pair.modified_by]
        }
    }

    private static fullUpdateStatement(pair: MetatypeRelationshipPairT): QueryConfig {
        return {
            text:`
UPDATE metatype_relationship_pairs
SET name = $1, description = $2, relationshipType = $3, origin_metatype_id = $4, destination_metatype_id = $5
WHERE id = $6`,
            values: [pair.name, pair.description,
                pair.relationship_type,
                pair.origin_metatype_id,
                pair.destination_metatype_id,
                pair.id]
        }
    }

    private static archiveStatement(pairID: string, userID: string): QueryConfig {
        return {
            text:`UPDATE metatype_relationship_pairs SET archived = true, modified_by = $2  WHERE id = $1`,
            values: [pairID, userID]
        }
    }

    private static deleteStatement(pairID: string): QueryConfig {
        return {
            text:`DELETE FROM metatype_relationship_pairs WHERE id = $1`,
            values: [pairID]
        }
    }

    private static retrieveStatement(pairID:string): QueryConfig {
        return {
            text:`SELECT * FROM metatype_relationship_pairs WHERE id = $1 AND NOT ARCHIVED`,
            values: [pairID]
        }
    }

    private static retrieveForOriginStatement(origin:string): QueryConfig {
        return {
            text:`SELECT * FROM metatype_relationship_pairs WHERE origin_metatype_id = $1 AND NOT ARCHIVED`,
            values: [origin]
        }
    }

    private static retrieveForDestinationStatement(destination :string): QueryConfig {
        return {
            text:`SELECT * FROM metatype_relationship_pairs WHERE destination_metatype_id = $1 AND NOT ARCHIVED`,
            values: [destination]
        }
    }

    private static retrieveForDestinationAndOriginStatement(origin: string, destination :string): QueryConfig {
        return {
            text:`SELECT * FROM metatype_relationship_pairs WHERE origin_metatype_id = $1 AND destination_metatype_id = $2 AND NOT ARCHIVED`,
            values: [origin, destination]
        }
    }

    private static retrieveForDestinationAndOriginAndRelationshipStatement(origin: string, destination :string, relationship:string): QueryConfig {
        return {
            text:`SELECT * FROM metatype_relationship_pairs WHERE origin_metatype_id = $1 AND destination_metatype_id = $2 AND relationship_id = $3 AND NOT ARCHIVED`,
            values: [origin, destination, relationship]
        }
    }

    private static listStatement(containerID:string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM metatype_relationship_pairs WHERE container_id = $1 AND NOT archived OFFSET $2 LIMIT $3`,
            values: [containerID, offset, limit]
        }
    }
}
