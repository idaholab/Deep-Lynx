import PostgresStorage from "../postgresStorage";
import {PoolClient, Query, QueryConfig} from "pg";
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
import GraphStorage from "./graph_storage";
import Logger from "../../logger";
import MetatypeRelationshipStorage from "../metatype_relationship_storage";

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

    public async CreateOrUpdateByActiveGraph(containerID: string, input: any | EdgesT, preQueries?: QueryConfig[], postQueries?: QueryConfig[]): Promise<Result<EdgesT>> {
        const activeGraph = await GraphStorage.Instance.ActiveForContainer(containerID);
        if (activeGraph.isError || !activeGraph.value) {
            Logger.error(activeGraph.error?.error!);
        }
        const graphID: string = activeGraph.value.graph_id;

        return EdgeStorage.Instance.CreateOrUpdate(containerID, graphID, input);
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
    public async CreateOrUpdate(containerID: string, graphID: string, input: any | EdgesT, client?: PoolClient, preQueries?: QueryConfig[], postQueries?: QueryConfig[]): Promise<Result<EdgesT>> {
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
                   // fetch the relationship itself first
                   const metatypeRelationshipPair = await MetatypeRelationshipPairStorage.Instance.Retrieve(es[e].relationship_pair_id)
                   if(metatypeRelationshipPair.isError) {
                       resolve(Result.Pass(metatypeRelationshipPair))
                   }

                   const relationship = await MetatypeRelationshipStorage.Instance.Retrieve(metatypeRelationshipPair.value.relationship_id)
                   if(relationship.isError) {
                       resolve(Result.Pass(relationship))
                   }

                   if(!keysByRelationshipID[relationship.value.id!]) {

                       const typeKeys = await MetatypeRelationshipKeyStorage.Instance.List(relationship.value.id!);
                       if(typeKeys.isError) {
                          resolve(Result.Failure(`edges's properties do no match declared relationship: ${es[e]}`));
                       }

                       keysByRelationshipID[relationship.value.id!] = typeKeys.value
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



                   const pair = await MetatypeRelationshipPairStorage.Instance.RetrieveByMetatypesAndRelationship(origin.metatype_id, destination.metatype_id, es[e].relationship_pair_id);
                   if(pair.isError) {
                       resolve(Result.Failure(`unable to verify the validity of the proposed relationship between nodes`));
                       return
                   }

                   const validPayload = await this.validateAndTransformEdgeProperties((keysByRelationshipID[relationship.value.id!]),es[e].properties);
                   if(validPayload.isError ) {
                       resolve(Result.Failure(`edges's properties do no match declared relationship type: ${es[e].relationship_pair_id}`));
                       return
                   }

                   // replace the properties with the validated and transformed payload
                   es[e].properties = validPayload.value

                   // verify that the relationship is valid if new edge
                   if(!es[e].modified_at && !es[e].deleted_at && !es[e].id) {
                        const relationshipValid = await this.validateRelationship(pair.value, origin, destination);
                        if(relationshipValid.isError || !relationshipValid.value) {
                            resolve(Result.Failure(`unable to create relationship between nodes, fails relationship constraint: ${relationshipValid.error?.error}`))
                        }
                    }

                   es[e].graph_id = graphID;
                   es[e].container_id = containerID;

                   if((es[e].modified_at || es[e].deleted_at) && es[e].id) queries.push(...EdgeStorage.updateStatement(es[e]))
                   else if((es[e].modified_at || es[e].deleted_at) && !es[e].id && es[e].original_data_id && es[e].data_source_id) queries.push(...EdgeStorage.updateByCompositeOriginalIDStatement(es[e]))
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

    // client? is needed so that we can search for nodes inside of a transaction. See the data processing loop where this is used to
    // get a better picture of whats happening
    public async CreateOrUpdateStatement(containerID: string, graphID: string, es: EdgesT, client?: PoolClient, preQueries?: QueryConfig[], postQueries?: QueryConfig[]): Promise<Result<QueryConfig[]>> {
            const queries : QueryConfig[] = [];
            if(preQueries) queries.push(...preQueries);

            // validate each edge's properties for the declared type We don't
            // have to check the edge ID because they would not have gotten this
            // far without one present, and validateProperties will fail if
            // no metatype is found
            const keysByRelationshipID: {[key:string]: any} = [];

            for(const e in es) {
                // find and register metatype relationship keys

                // fetch the relationship itself first
                const metatypeRelationshipPair = await MetatypeRelationshipPairStorage.Instance.Retrieve(es[e].relationship_pair_id)
                if(metatypeRelationshipPair.isError) {
                    return new Promise(resolve => resolve(Result.Pass(metatypeRelationshipPair)))
                }

                const relationship = await MetatypeRelationshipStorage.Instance.Retrieve(metatypeRelationshipPair.value.relationship_id)
                if(relationship.isError) {
                    return new Promise(resolve => resolve(Result.Pass(relationship)))
                }

                if(!keysByRelationshipID[relationship.value.id!]) {

                    const typeKeys = await MetatypeRelationshipKeyStorage.Instance.List(relationship.value.id!);
                    if(typeKeys.isError) {
                        return new Promise(resolve => resolve(Result.Failure(`edges's properties do no match declared relationship: ${es[e]}`)));
                    }

                    keysByRelationshipID[relationship.value.id!] = typeKeys.value
                }


                // Verifies that a relationship pair actually exists for these two nodes
                let origin: NodeT
                if(es[e].origin_node_id){
                    const request = await NodeStorage.Instance.Retrieve(es[e].origin_node_id!, client);
                    if(request.isError) {
                        return new Promise(resolve => resolve(Result.Failure("origin node not found")));
                    }

                    origin = request.value
                } else if(es[e].origin_node_original_id && es[e].data_source_id) {
                    const request = await NodeStorage.Instance.RetrieveByOriginalID(es[e].origin_node_original_id!, es[e].data_source_id!, client);
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
                    const request = await NodeStorage.Instance.Retrieve(es[e].destination_node_id!, client);
                    if(request.isError) {
                        return new Promise(resolve => resolve(Result.Failure("destination node not found")));
                    }

                    destination = request.value
                } else if(es[e].destination_node_original_id && es[e].data_source_id) {
                    const request = await NodeStorage.Instance.RetrieveByOriginalID(es[e].destination_node_original_id!, es[e].data_source_id!, client);
                    if(request.isError) {
                        return new Promise(resolve => resolve(Result.Failure("destination node not found")));
                    }

                    destination = request.value
                    es[e].destination_node_id = request.value.id!
                } else {
                    return new Promise(resolve => resolve(Result.Failure("no destination node id provided")))
                }



                const pair = await MetatypeRelationshipPairStorage.Instance.RetrieveByMetatypesAndRelationship(origin.metatype_id, destination.metatype_id, es[e].relationship_pair_id);
                if(pair.isError) {
                    return new Promise(resolve => resolve(Result.Failure(`unable to verify the validity of the proposed relationship between nodes`)));
                }

                const validPayload = await this.validateAndTransformEdgeProperties((keysByRelationshipID[relationship.value.id!]),es[e].properties);
                if(validPayload.isError) {
                    return new Promise(resolve => resolve(Result.Failure(`edges's properties do no match declared relationship type: ${es[e].relationship_pair_id}`)));
                }

                // replace the properties with the validated and transformed payload
                es[e].properties = validPayload.value

                // verify that the relationship is valid if new edge
                if(!es[e].modified_at && !es[e].deleted_at && es[e].id) {
                    const relationshipValid = await this.validateRelationship(pair.value, origin, destination);
                    if(relationshipValid.isError || !relationshipValid.value) {
                        return new Promise(resolve => resolve(Result.Failure(`unable to create relationship between nodes, fails relationship constraint: ${relationshipValid.error?.error}`)))
                    }
                }

                es[e].graph_id = graphID;
                es[e].container_id = containerID;

                if((es[e].modified_at || es[e].deleted_at) && es[e].id) queries.push(...EdgeStorage.updateStatement(es[e]))
                else if((es[e].modified_at || es[e].deleted_at) && !es[e].id && es[e].original_data_id && es[e].data_source_id) queries.push(...EdgeStorage.updateByCompositeOriginalIDStatement(es[e]))
                else {
                    es[e].id = super.generateUUID();
                    queries.push(...EdgeStorage.createStatement(es[e]))
                }
            }


            if(postQueries) queries.push(...postQueries);

            return new Promise(resolve => resolve(Result.Success(queries)))
    }

    public async ListByOrigin(nodeID: string): Promise<Result<EdgeT[]>> {
        return super.rows<EdgeT>(EdgeStorage.listAllByOriginStatement(nodeID))
    }

    public async ListByDestination(nodeID: string): Promise<Result<EdgeT[]>> {
        return super.rows<EdgeT>(EdgeStorage.listAllByDestinationStatement(nodeID))
    }

    public async List(containerID: string, offset: number, limit:number): Promise<Result<EdgeT[]>> {
        return super.rows<EdgeT>(EdgeStorage.listStatement(containerID, offset, limit))
    }

    public async RetriveByOriginAndDestination(originID: string, destinationID: string): Promise<Result<EdgeT[]>> {
        return super.rows<EdgeT>(EdgeStorage.retrieveByOriginAndDestinationStatement(originID, destinationID))
    }

    private async validateAndTransformEdgeProperties(relationshipKeys: MetatypeRelationshipKeyT[], input: any): Promise<Result<any>> {
       const compiledType = CompileMetatypeKeys(relationshipKeys);

        // before we attempt to validate we need to insure that any keys with default values have that applied to the payload
       for(const key of relationshipKeys) {
            if(key.property_name in input) continue;

            switch(key.data_type) {
                case "number": {
                    input[key.property_name] = +key.default_value!
                    break;
                }

                case "boolean": {
                    input[key.property_name] = key.default_value === "true" || key.default_value === "t"
                    break;
                }

                default: {
                    input[key.property_name] = key.default_value
                    break;
                }
            }
        }


       const onValidateSuccess = ( resolve: (r:any) => void): (c: any)=> void => {
            return async (cts:any) => {
                for(const key of relationshipKeys) {
                    if(key.validation === undefined || key.validation === null) continue;

                    if(key.validation.min || key.validation.max) {
                        if(key.validation.min !== undefined || input[key.property_name] < key.validation.min!) {
                            resolve(Result.Failure(`validation of ${key.property_name} failed, less than min`))
                        }

                        if(key.validation.max !== undefined || input[key.property_name] > key.validation.max!) {
                            resolve(Result.Failure(`validation of ${key.property_name} failed, more than max`))
                        }
                    }

                    if(key.validation && key.validation.regex) {
                        const matcher = new RegExp(key.validation.regex)

                        if(!matcher.test(input[key.property_name])) {
                            resolve(Result.Failure(`validation of ${key.property_name} failed, regex mismatch `))
                        }
                    }
                }
                resolve(Result.Success(cts))
            }
        };

       return new Promise((resolve) => {
            pipe(compiledType.decode(input), fold(this.OnDecodeError(resolve), onValidateSuccess(resolve)))
        })
    }

    private async validateRelationship(pair: MetatypeRelationshipPairT, origin: NodeT, destination: NodeT): Promise<Result<boolean>> {
        if(pair.origin_metatype_id !== origin.metatype_id || pair.destination_metatype_id !== destination.metatype_id) {
            return Promise.resolve(Result.Failure('origin and destination node types do not match relationship pair'))
        }

        const currentRelationships = await super.rows<EdgeT>(EdgeStorage.listAllByRelationshipTypeStatement(pair.id!, origin.id!, destination.id!));
        if(!currentRelationships.isError && currentRelationships.value.length > 0) {
            return Promise.resolve(Result.Failure(`proposed relationship of type: ${pair.relationship_id} between ${origin.id} and ${destination.id} already exists, modify or delete current relationship first`))
        }

        const destinationRelationships = await super.rows<EdgeT>(EdgeStorage.listAllByDestinationAndPairStatement(destination.id!, pair.id!));
        const originRelationships = await super.rows<EdgeT>(EdgeStorage.listAllByOriginAndPairStatement(origin.id!, pair.id!));

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
INSERT INTO edges(id, container_id, relationship_pair_id, graph_id, origin_node_id, destination_node_id, properties,original_data_id,data_source_id,type_mapping_transformation_id,origin_node_original_id,destination_node_original_id,import_data_id,data_staging_id,composite_original_id)
VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,$15)
ON CONFLICT (composite_original_id, data_source_id)
DO
UPDATE SET container_id = $2, relationship_pair_id = $3, graph_id = $4, origin_node_id = $5, destination_node_id = $6, properties = $7, original_data_id = $8, data_source_id = $9, type_mapping_transformation_id = $10, origin_node_original_id = $11, destination_node_original_id = $12, import_data_id = $13, data_staging_id = $14, composite_original_id = $15 modified_at = NOW()
`,
                values: [e.id, e.container_id, e.relationship_pair_id,e.graph_id, e.origin_node_id, e.destination_node_id,  e.properties,e.original_data_id, e.data_source_id, e.type_mapping_transformation_id, e.origin_node_original_id, e.destination_node_original_id, e.import_data_id, e.data_staging_id, e.composite_original_id]
            }
        ]
    }

    private static updateStatement(e: EdgeT): QueryConfig[] {
        return [{
            text: `UPDATE edges SET container_id = $1, relationship_pair_id = $2, graph_id = $3, origin_node_id = $4, destination_node_id = $5, properties = $6, original_data_id = $7, data_source_id = $8, type_mapping_transformation_id = $9, origin_node_original_id = $10, destination_node_original_id = $11, import_data_id = $13, data_staging_id = $14, composite_original_id = $15 WHERE id = $12`,
            values: [e.container_id, e.relationship_pair_id,e.graph_id, e.origin_node_id, e.destination_node_id,  e.properties, e.original_data_id, e.data_source_id, e.type_mapping_transformation_id, e.origin_node_original_id, e.destination_node_original_id, e.id, e.import_data_id, e.data_staging_id, e.composite_original_id]
        }]
    }

    private static updateByCompositeOriginalIDStatement(e: EdgeT): QueryConfig[] {
        return [{
            text: `UPDATE edges SET container_id = $1, relationship_pair_id = $2, graph_id = $3, origin_node_id = $4, destination_node_id = $5, properties = $6, original_data_id = $7, data_source_id = $8, type_mapping_transformation_id = $9, origin_node_original_id = $10, destination_node_original_id = $11, import_data_id = $14, data_staging_id = $15, composite_original_id = $16 WHERE composite_original_id = $16 AND data_source_id = $13`,
            values: [e.container_id, e.relationship_pair_id,e.graph_id, e.origin_node_id, e.destination_node_id,  e.properties, e.original_data_id, e.data_source_id, e.type_mapping_transformation_id, e.origin_node_original_id, e.destination_node_original_id, e.original_data_id, e.data_source_id, e.import_data_id, e.data_staging_id, e.composite_original_id]
        }]
    }

    private static listAllByOriginStatement(nodeID: string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE origin_node_id = $1 AND NOT archived`,
            values: [nodeID]
        }
    }

    private static listAllByDestinationStatement(nodeID: string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE destination_node_id = $1 AND NOT archived`,
            values: [nodeID]
        }
    }


    private static listAllByDestinationAndPairStatement(nodeID: string, relationshipPairID: string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE destination_node_id = $1 AND relationship_pair_id = $2 AND NOT archived`,
            values: [nodeID, relationshipPairID]
        }
    }

    private static listAllByOriginAndPairStatement(nodeID: string, relationshipPairID: string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE origin_node_id = $1 AND relationship_pair_id = $2 AND NOT archived`,
            values: [nodeID, relationshipPairID]
        }
    }

    private static listAllByRelationshipTypeStatement(relationshipTypeID: string, origin:string, destination:string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE relationship_pair_id = $1 AND origin_node_id = $2 AND destination_node_id = $3 AND NOT archived`,
            values: [relationshipTypeID, origin, destination]
        }
    }

    private static listStatement(containerID: string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE container_id = $1 AND NOT archived OFFSET $2 LIMIT $3`,
            values: [containerID, offset, limit]
        }
    }

    private static retrieveByOriginAndDestinationStatement(originID: string, destinationID: string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE origin_node_id = $1 AND destination_node_id = $2 AND NOT archived`,
            values: [originID, destinationID]
        }
    }

    private static archiveStatement(edgeID: string): QueryConfig {
        return {
            text:`UPDATE edges SET archived = true  WHERE id = $1`,
            values: [edgeID]
        }
    }

    private static deleteStatement(edgeID: string): QueryConfig {
        return {
            text:`DELETE FROM edges WHERE id = $1`,
            values: [edgeID]
        }
    }
}
