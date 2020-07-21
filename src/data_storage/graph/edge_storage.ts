import PostgresStorage from "../postgresStorage";
import {Query, QueryConfig} from "pg";
import {edgesT, EdgesT, EdgeT} from "../../types/graph/edgeT";
import * as t from "io-ts";
import {MetatypeRelationshipKeyT} from "../../types/metatype_relationship_keyT";
import Result from "../../result";
import {CompileMetatypeKeys} from "../../types/metatype_keyT";
import {pipe} from "fp-ts/lib/pipeable";
import {fold} from "fp-ts/lib/Either";
import MetatypeRelationshipKeyStorage from "../metatype_relationship_key_storage";
import {NodeT} from "../../types/graph/nodeT";
import NodeStorage from "./node_storage";
import MetatypeRelationshipPairStorage from "../metatype_relationship_pair_storage";
import {MetatypeRelationshipPairT} from "../../types/metatype_relationship_pairT";

/*
* EdgeStorage allows the user to create a graph relationship (edge) between two nodes of data
* while verifying that the relationship is allowed according to the currently stored ontology
*/
export default class EdgeStorage extends PostgresStorage{
    public static tableName = "edges";

    private static instance: EdgeStorage;

    public static get Instance(): EdgeStorage {
        if(!EdgeStorage.instance) {
            EdgeStorage.instance = new EdgeStorage()
        }

        return EdgeStorage.instance
    }

    // Create Edge Unknown
    /*
    verify payload is of edge(s) type
    for each edge verify that the properties match the relationship type
    verify that the destination and origin combination match
    run function for each of the relationship types (many:many) as last validation

    When possible, include the data_source_id property in the passed in payloads.
    This insures that if needed, we can search the required nodes for connection by
    their original_data_id tag vs. the internal id assigned by the system.

    This will attempt to create an edge if one doesn't exist, or update the edge if
    exists and is valid.
     */
    public async CreateOrUpdate(containerID: string, graphID: string, input: any | EdgesT, preQueries?: QueryConfig[], postQueries?: QueryConfig[]): Promise<Result<EdgesT>> {
        const onValidateSuccess = ( resolve: (r:any) => void): (e: EdgesT) => void => {
           return async (es: EdgesT) => {

               const queries : QueryConfig[] = [];
               if(preQueries) queries.push(...preQueries);

               // validate each edge's properties for the declared type We don't
               // have to check the edge ID because they would not have gotten this
               // far without one present, and validateProperties will fail if
               // no metatype is found
               const keysByRelationshipID: {[key:string]: any} = [];

               for(const e in es) {
                   // find and register metatype relationship keys
                   if(!keysByRelationshipID[es[e].relationship_id]) {

                       const typeKeys = await MetatypeRelationshipKeyStorage.Instance.List(es[e].relationship_id);
                       if(typeKeys.isError) {
                           resolve(Result.Failure(`edges's properties do no match declared relationship: ${es[e]}`));
                           return
                       }

                       keysByRelationshipID[es[e].relationship_id] = typeKeys.value
                   }


                   // Verifies that a relationship pair actually exists for these two nodes
                   let origin: NodeT
                   if(es[e].origin_node_id){
                       const request = await NodeStorage.Instance.Retrieve(es[e].origin_node_id!);
                       if(request.isError) {
                           resolve(Result.Failure("origin node not found"));
                           return
                       }

                       origin = request.value
                   } else if(es[e].origin_node_original_id && es[e].data_source_id) {
                       const request = await NodeStorage.Instance.RetrieveByOriginalID(es[e].origin_node_original_id!, es[e].data_source_id!);
                       if(request.isError) {
                           resolve(Result.Failure("origin node not found"));
                           return
                       }

                       origin = request.value
                       es[e].origin_node_id = request.value.id!
                   } else {
                       resolve(Result.Failure("no origin node id provided"))
                       return
                   }


                   let destination: NodeT
                   if(es[e].destination_node_id) {
                       const request = await NodeStorage.Instance.Retrieve(es[e].destination_node_id!);
                       if(request.isError) {
                           resolve(Result.Failure("destination node not found"));
                           return
                       }

                       destination = request.value
                   } else if(es[e].destination_node_original_id && es[e].data_source_id) {
                       const request = await NodeStorage.Instance.RetrieveByOriginalID(es[e].destination_node_original_id!, es[e].data_source_id!);
                       if(request.isError) {
                           resolve(Result.Failure("destination node not found"));
                           return
                       }

                       destination = request.value
                       es[e].destination_node_id = request.value.id!
                   } else {
                       resolve(Result.Failure("no destination node id provided"))
                       return
                   }



                   const pair = await MetatypeRelationshipPairStorage.Instance.RetrieveByMetatypesAndRelationship(origin.metatype_id, destination.metatype_id, es[e].relationship_id);
                   if(pair.isError) {
                       resolve(Result.Failure(`unable to verify the validity of the proposed relationship between nodes`));
                       return
                   }

                   const valid = await this.validateEdgeProperties((keysByRelationshipID[es[e].relationship_id]),es[e].properties);
                   if(valid.isError || !valid.value) {
                       resolve(Result.Failure(`edges's properties do no match declared relationship type: ${es[e].relationship_id}`));
                       return
                   }

                   // verify that the relationship is valid
                   const relationshipValid = await this.validateRelationship(pair.value, origin, destination);
                   if(relationshipValid.isError || !relationshipValid.value) {
                       resolve(Result.Failure(`unable to create relationship between nodes, fails relationship constraint: ${relationshipValid.error?.error}`))
                   }


                   es[e].graph_id = graphID;
                   es[e].container_id = containerID;

                   if((es[e].modified_at || es[e].deleted_at) && es[e].id) queries.push(...EdgeStorage.updateStatement(es[e]))
                   else if((es[e].modified_at || es[e].deleted_at) && !es[e].id && es[e].original_data_id && es[e].data_source_id) queries.push(...EdgeStorage.updateByOriginalIDStatement(es[e]))
                   else {
                       es[e].id = super.generateUUID();
                       queries.push(...EdgeStorage.createStatement(es[e]))
                   }
               }


               if(postQueries) queries.push(...postQueries);
               super.runAsTransaction(...queries)
                   .then((r) => {
                       if(r.isError) {
                           resolve(r);
                           return
                       }

                       resolve(Result.Success(es))
                   })
           }
        };

        const payload = (t.array(t.unknown).is(input)) ? input : [input];

        return super.decodeAndValidate<EdgesT>(edgesT, onValidateSuccess, payload)
    }

    public async CreateOrUpdateStatement(containerID: string, graphID: string, es: EdgesT, preQueries?: QueryConfig[], postQueries?: QueryConfig[]): Promise<Result<QueryConfig[]>> {
            const queries : QueryConfig[] = [];
            if(preQueries) queries.push(...preQueries);

            // validate each edge's properties for the declared type We don't
            // have to check the edge ID because they would not have gotten this
            // far without one present, and validateProperties will fail if
            // no metatype is found
            const keysByRelationshipID: {[key:string]: any} = [];

            for(const e in es) {
                // find and register metatype relationship keys
                if(!keysByRelationshipID[es[e].relationship_id]) {

                    const typeKeys = await MetatypeRelationshipKeyStorage.Instance.List(es[e].relationship_id);
                    if(typeKeys.isError) {
                        return new Promise(resolve => resolve(Result.Failure(`edges's properties do no match declared relationship: ${es[e]}`)));
                    }

                    keysByRelationshipID[es[e].relationship_id] = typeKeys.value
                }


                // Verifies that a relationship pair actually exists for these two nodes
                let origin: NodeT
                if(es[e].origin_node_id){
                    const request = await NodeStorage.Instance.Retrieve(es[e].origin_node_id!);
                    if(request.isError) {
                        return new Promise(resolve => resolve(Result.Failure("origin node not found")));
                    }

                    origin = request.value
                } else if(es[e].origin_node_original_id && es[e].data_source_id) {
                    const request = await NodeStorage.Instance.RetrieveByOriginalID(es[e].origin_node_original_id!, es[e].data_source_id!);
                    if(request.isError) {
                        return new Promise(resolve => resolve(Result.Failure("origin node not found")));
                    }

                    origin = request.value
                    es[e].origin_node_id = request.value.id!
                } else {
                    return new Promise(resolve => resolve(Result.Failure("no origin node id provided")))
                }


                let destination: NodeT
                if(es[e].destination_node_id) {
                    const request = await NodeStorage.Instance.Retrieve(es[e].destination_node_id!);
                    if(request.isError) {
                        return new Promise(resolve => resolve(Result.Failure("destination node not found")));
                    }

                    destination = request.value
                } else if(es[e].destination_node_original_id && es[e].data_source_id) {
                    const request = await NodeStorage.Instance.RetrieveByOriginalID(es[e].destination_node_original_id!, es[e].data_source_id!);
                    if(request.isError) {
                        return new Promise(resolve => resolve(Result.Failure("destination node not found")));
                    }

                    destination = request.value
                    es[e].destination_node_id = request.value.id!
                } else {
                    return new Promise(resolve => resolve(Result.Failure("no destination node id provided")))
                }



                const pair = await MetatypeRelationshipPairStorage.Instance.RetrieveByMetatypesAndRelationship(origin.metatype_id, destination.metatype_id, es[e].relationship_id);
                if(pair.isError) {
                    return new Promise(resolve => resolve(Result.Failure(`unable to verify the validity of the proposed relationship between nodes`)));
                }

                const valid = await this.validateEdgeProperties((keysByRelationshipID[es[e].relationship_id]),es[e].properties);
                if(valid.isError || !valid.value) {
                    return new Promise(resolve => resolve(Result.Failure(`edges's properties do no match declared relationship type: ${es[e].relationship_id}`)));
                }

                // verify that the relationship is valid
                const relationshipValid = await this.validateRelationship(pair.value, origin, destination);
                if(relationshipValid.isError || !relationshipValid.value) {
                    return new Promise(resolve => resolve(Result.Failure(`unable to create relationship between nodes, fails relationship constraint: ${relationshipValid.error?.error}`)))
                }


                es[e].graph_id = graphID;
                es[e].container_id = containerID;

                if((es[e].modified_at || es[e].deleted_at) && es[e].id) queries.push(...EdgeStorage.updateStatement(es[e]))
                else if((es[e].modified_at || es[e].deleted_at) && !es[e].id && es[e].original_data_id && es[e].data_source_id) queries.push(...EdgeStorage.updateByOriginalIDStatement(es[e]))
                else {
                    es[e].id = super.generateUUID();
                    queries.push(...EdgeStorage.createStatement(es[e]))
                }
            }


            if(postQueries) queries.push(...postQueries);

            return new Promise(resolve => resolve(Result.Success(queries)))
    }

    public ListByOrigin(nodeID: string): Promise<Result<EdgeT[]>> {
        return super.rows<EdgeT>(EdgeStorage.listAllByOrigin(nodeID))
    }


    private async validateEdgeProperties(relationshipKeys: MetatypeRelationshipKeyT[], input: any): Promise<Result<boolean>> {
       const compiledType = CompileMetatypeKeys(relationshipKeys);

       const payload = (t.array(t.unknown).is(input)) ? input : [input];

       const onValidateSuccess = ( resolve: (r:any) => void): (c: any)=> void => {
            return async (cts:any) => {
                resolve(Result.Success(true))
            }
        };

       return new Promise((resolve) => {
            pipe(t.array(compiledType).decode(payload), fold(this.OnDecodeError(resolve), onValidateSuccess(resolve)))
        })
    }

    private async validateRelationship(pair: MetatypeRelationshipPairT, origin: NodeT, destination: NodeT): Promise<Result<boolean>> {
        if(pair.origin_metatype_id !== origin.metatype_id || pair.destination_metatype_id !== destination.metatype_id) {
            return Promise.resolve(Result.Failure('origin and destination node types do not match relationship pair'))
        }

        const currentRelationships = await super.rows<EdgeT>(EdgeStorage.listAllByRelationshipType(pair.id!, origin.id!, destination.id!));
        if(!currentRelationships.isError && currentRelationships.value.length > 0) {
            return Promise.resolve(Result.Failure(`proposed relationship of type: ${pair.relationship_id} between ${origin.id} and ${destination.id} already exists, modify or delete current relationship first`))
        }

        const destinationRelationships = await super.rows<EdgeT>(EdgeStorage.listAllByDestinationAndPair(destination.id!, pair.id!));
        const originRelationships = await super.rows<EdgeT>(EdgeStorage.listAllByOriginAndPair(origin.id!, pair.id!));

        switch(pair.relationship_type) {
            // we don't need to check a many:many as we don't have to verify more than whether or not the origin
            // and destination types match
            case "many:many": {
                break;
            }

            case "one:one": {
                if(!destinationRelationships.isError && destinationRelationships.value.length > 0 ) {
                    return Promise.resolve(Result.Failure(`proposed relationship of type: ${pair.relationship_id} between ${origin.id} and ${destination.id} violates the one:one relationship constraint`))
                }

                if(!originRelationships.isError && originRelationships.value.length > 0 ) {
                    return Promise.resolve(Result.Failure(`proposed relationship of type: ${pair.relationship_id} between ${origin.id} and ${destination.id} violates the one:one relationship constraint`))
                }

                break;
            }

            case "one:many": {
                if(!destinationRelationships.isError && destinationRelationships.value.length > 0 ) {
                    return Promise.resolve(Result.Failure(`proposed relationship of type: ${pair.relationship_id} between ${origin.id} and ${destination.id} violates the one:many relationship constraint`))
                }

                break;
            }

            case "many:one": {
                if(!originRelationships.isError && originRelationships.value.length > 0 ) {
                    return Promise.resolve(Result.Failure(`proposed relationship of type: ${pair.relationship_id} between ${origin.id} and ${destination.id} violates the many:one relationship constraint`))
                }

                break;
            }
        }

        return Promise.resolve(Result.Success(true))
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(EdgeStorage.deleteStatement(id))
    }

    public Archive(id: string): Promise<Result<boolean>> {
        return super.run(EdgeStorage.archiveStatement(id))
    }

    private static createStatement(e: EdgeT): QueryConfig[] {
        return [
            {
                text:`
INSERT INTO edges(id, container_id, relationship_id, graph_id, origin_node_id, destination_node_id, properties,original_data_id,data_source_id,data_type_mapping_id,origin_node_original_id,destination_node_original_id)
VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                values: [e.id, e.container_id, e.relationship_id,e.graph_id, e.origin_node_id, e.destination_node_id,  e.properties,e.original_data_id, e.data_source_id, e.data_type_mapping_id, e.origin_node_original_id, e.destination_node_original_id]
            }
        ]
    }

    private static updateStatement(e: EdgeT): QueryConfig[] {
        return [{
            text: `UPDATE edges SET container_id = $1, relationship_id = $2, graph_id = $3, origin_node_id = $4, destination_node_id = $5, properties = $6, original_data_id = $7, data_source_id = $8, data_type_mapping_id = $9, origin_node_original_id = $10, destination_node_original_id = $11 WHERE id = $12`,
            values: [e.container_id, e.relationship_id,e.graph_id, e.origin_node_id, e.destination_node_id,  e.properties, e.original_data_id, e.data_source_id, e.data_type_mapping_id, e.origin_node_original_id, e.destination_node_original_id, e.id]
        }]
    }

    private static updateByOriginalIDStatement(e: EdgeT): QueryConfig[] {
        return [{
            text: `UPDATE edges SET container_id = $1, relationship_id = $2, graph_id = $3, origin_node_id = $4, destination_node_id = $5, properties = $6, original_data_id = $7, data_source_id = $8, data_type_mapping_id = $9, origin_node_original_id = $10, destination_node_original_id = $11 WHERE original_id = $12 AND data_source_id = $13`,
            values: [e.container_id, e.relationship_id,e.graph_id, e.origin_node_id, e.destination_node_id,  e.properties, e.original_data_id, e.data_source_id, e.data_type_mapping_id, e.origin_node_original_id, e.destination_node_original_id, e.original_data_id, e.data_source_id]
        }]
    }

    private static listAllByOrigin(nodeID: string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE origin_node_id = $1 AND NOT archived`,
            values: [nodeID]
        }
    }


    private static listAllByDestinationAndPair(nodeID: string, relationshipPairID: string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE destination_node_id = $1 AND relationship_id = $2 AND NOT archived`,
            values: [nodeID, relationshipPairID]
        }
    }

    private static listAllByOriginAndPair(nodeID: string, relationshipPairID: string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE origin_node_id = $1 AND relationship_id = $2 AND NOT archived`,
            values: [nodeID, relationshipPairID]
        }
    }

    private static listAllByRelationshipType(relationshipTypeID: string, origin:string, destination:string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE relationship_id = $1 AND origin_node_id = $2 AND destination_node_id = $3 AND NOT archived`,
            values: [relationshipTypeID, origin, destination]
        }
    }

    private static edgesByRelationshipAndOrigin(relationshipID: string, originID: string): QueryConfig {
        return {
            text: `SELECT * from edges WHERE relationship_id = $1 AND origin_node_id = $2`,
            values: [relationshipID, originID]
        }
    }

    private static edgesByRelationshipAndDestination(relationshipID: string, destinationID: string): QueryConfig {
        return {
            text: `SELECT * from edges WHERE relationship_id = $1 AND destination_node_id = $2`,
            values: [relationshipID, destinationID]
        }
    }

    private static archiveStatement(nodeID: string): QueryConfig {
        return {
            text:`UPDATE edges SET archived = true  WHERE id = $1`,
            values: [nodeID]
        }
    }

    private static deleteStatement(nodeID: string): QueryConfig {
        return {
            text:`DELETE FROM edges WHERE id = $1`,
            values: [nodeID]
        }
    }
}
