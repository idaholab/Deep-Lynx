import Result from "../../result"
import PostgresStorage from "../postgresStorage";
import {PoolClient, QueryConfig} from "pg";
import * as t from "io-ts";
import {NodesT, NodeT, nodeT, nodesT} from "../../types/graph/nodeT";
import MetatypeKeyStorage from "../metatype_key_storage";
import {CompileMetatypeKeys, MetatypeKeyT} from "../../types/metatype_keyT";
import {pipe} from "fp-ts/lib/pipeable";
import {fold} from "fp-ts/lib/Either";
import MetatypeStorage from "../metatype_storage";
import GraphStorage from "./graph_storage";
import Logger from "../../logger";

/*
* NodeStorage encompasses all logic dealing with the manipulation of the data nodes
* class in a data storage layer.
*/
export default class NodeStorage extends PostgresStorage{
    public static tableName = "nodes";

    private static instance: NodeStorage;

    public static get Instance(): NodeStorage {
        if(!NodeStorage.instance) {
            NodeStorage.instance = new NodeStorage()
        }

        return NodeStorage.instance
    }

    public async CreateOrUpdateByActiveGraph(containerID: string, input: any | NodesT, preQueries?: QueryConfig[], postQueries?: QueryConfig[]): Promise<Result<NodesT>> {
        const activeGraph = await GraphStorage.Instance.ActiveForContainer(containerID);
        if (activeGraph.isError || !activeGraph.value) {
            Logger.error(activeGraph.error?.error!);
        }
        const graphID: string = activeGraph.value.graph_id;

        return NodeStorage.Instance.CreateOrUpdate(containerID, graphID, input);
    }

    /*
    Create accepts an unknown amount of payload. Payload must be a single
    or array of "Node" types or objects that conform to that type. Once validated
    the node record's properties are validated. If all validations succeed the
    node is inserted into the database and returned with its value.

    Whenever possible, pass in both the original_data_id and the data_source_id.
    This allows other operations, such as the edge connections, to be able to search
    by original id and separation between data sources.

    This will attempt to create a node if one doesn't exist, or update the node if
    passed an updated node.
    */
    public async CreateOrUpdate(containerID: string, graphID: string, input: any | NodesT, importID?:string, preQueries?: QueryConfig[], postQueries?: QueryConfig[]): Promise<Result<NodesT>> {
        const onValidateSuccess = ( resolve: (r:any) => void): (n: NodesT)=> void => {
            return async(ns: NodesT) => {
                const queries: QueryConfig[] = [];
                if(preQueries) queries.push(...preQueries);

                // validate each node's properties for declared type. We don't
                // have to check metatype id because they would not have gotten
                // here without one present, and validate properties will fail
                // if no metatype is found
                const keysByMetatypeID: {[key:string]: any} = [];

                for(const n in ns) {
                    // find and register metatype keys
                    if(!keysByMetatypeID[ns[n].metatype_id]) {
                        const m = await MetatypeStorage.Instance.Retrieve(ns[n].metatype_id);
                        if(m.isError || m.value.container_id !== containerID) {
                            resolve(Result.Failure(`unable to find metatype, or metatype does not belong to container`));
                            return
                        }

                        const typeKeys = await MetatypeKeyStorage.Instance.List(m.value.id!);
                        // allow creation of nodes for metatypes with no associated keys
                        if(typeKeys.isError || typeKeys.value.length < 0) {
                            resolve(Result.Failure(typeKeys.error?.error!));
                            return
                        }

                        keysByMetatypeID[ns[n].metatype_id] = typeKeys.value
                    }

                    const validPayload = await this.validateAndTransformNodeProperties((keysByMetatypeID[ns[n].metatype_id]), ns[n].properties);
                    if(validPayload.isError) {
                        resolve(Result.Failure(`node's properties do no match declared metatype: ${ns[n].metatype_id}`));
                        return
                    }

                    // replace the properties with the validated and transformed payload
                    ns[n].properties = validPayload.value
                    ns[n].graph_id = graphID;
                    ns[n].container_id = containerID;

                    // grab metatype_name if it was not supplied
                    if (typeof ns[n].metatype_name === 'undefined') {
                        ns[n].metatype_name = (await MetatypeStorage.Instance.Retrieve(ns[n].metatype_id)).value.name;
                    }


                    ns[n].id = super.generateUUID();
                    queries.push(...NodeStorage.createOrUpdateStatement(ns[n]))

                }

                if(postQueries) queries.push(...postQueries);

                super.runAsTransaction(...queries)
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(ns))
                    })
            }
        };

        const payload = (t.array(t.unknown).is(input)) ? input : [input];

        return super.decodeAndValidate<NodesT>(nodesT, onValidateSuccess, payload)
   }

    public async CreateOrUpdateStatement(containerID: string, graphID: string, ns: NodesT, importID?: string, preQueries?: QueryConfig[], postQueries?: QueryConfig[]): Promise<Result<QueryConfig[]>> {
                const queries: QueryConfig[] = [];
                if(preQueries) queries.push(...preQueries);

                // validate each node's properties for declared type. We don't
                // have to check metatype id because they would not have gotten
                // here without one present, and validate properties will fail
                // if no metatype is found
                const keysByMetatypeID: {[key:string]: any} = [];

                for(const n in ns) {
                    // find and register metatype keys
                    if(!keysByMetatypeID[ns[n].metatype_id]) {
                        const m = await MetatypeStorage.Instance.Retrieve(ns[n].metatype_id);
                        if(m.isError || m.value.container_id !== containerID) {
                            return new Promise(resolve => resolve(Result.Failure(`unable to find metatype, or metatype does not belong to container`)));
                        }

                        const typeKeys = await MetatypeKeyStorage.Instance.List(m.value.id!);
                        if(typeKeys.isError || typeKeys.value.length <= 0) {
                            return new Promise(resolve => resolve(Result.Failure(typeKeys.error?.error!)));
                        }

                        keysByMetatypeID[ns[n].metatype_id] = typeKeys.value
                    }

                    const validPayload = await this.validateAndTransformNodeProperties((keysByMetatypeID[ns[n].metatype_id]), ns[n].properties);
                    if(validPayload.isError) {
                        return new Promise(resolve => resolve(Result.Failure(`node's properties do no match declared metatype: ${ns[n].metatype_id}`)));
                    }

                    // replace the properties with the validated and transformed payload
                    ns[n].properties = validPayload.value
                    ns[n].graph_id = graphID;
                    ns[n].container_id = containerID;

                    ns[n].id = super.generateUUID();
                    queries.push(...NodeStorage.createOrUpdateStatement(ns[n]))

                }

                if(postQueries) queries.push(...postQueries);

                return new Promise(resolve => resolve(Result.Success(queries)))
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(NodeStorage.deleteStatement(id))
    }

    public Archive(id: string): Promise<Result<boolean>> {
        return super.run(NodeStorage.archiveStatement(id))
    }

    private async validateAndTransformNodeProperties(typeKeys: MetatypeKeyT[], input:any): Promise<Result<any>> {
        // easiest way to create type for callback func
        const compiledType = CompileMetatypeKeys(typeKeys);


        // before we attempt to validate we need to insure that any keys with default values have that applied to the payload
        for(const key of typeKeys) {
            if(key.property_name in input || key.default_value === null) continue;

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
                // now that we know the payload matches the shape of the data required, run additional validation
                // such as regex pattern matching on string payloads
                for(const key of typeKeys) {
                    if(key.validation === null || key.validation === undefined) continue;

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

    public async Retrieve(id: string, client?:PoolClient): Promise<Result<NodeT>> {
        return super.retrieve<NodeT>(NodeStorage.retrieveStatement(id), client)
    }

    public async RetrieveByOriginalID(originalID: string, dataSourceID: string, client?:PoolClient): Promise<Result<NodeT>> {
        return super.retrieve<NodeT>(NodeStorage.retrieveByOriginalIDStatement(dataSourceID, originalID), client)
    }

    public DomainRetrieve(id: string, containerID: string): Promise<Result<NodeT>> {
        return super.retrieve<NodeT>(NodeStorage.domainRetrieveStatement(id, containerID))
    }

    public async ListByMetatypeID(metatypeID: string, offset: number, limit:number): Promise<Result<NodeT[]>> {
        return super.rows<NodeT>(NodeStorage.listByMetatypeIDStatement(metatypeID, offset, limit))
    }

    public async List(containerID: string, offset: number, limit:number): Promise<Result<NodeT[]>> {
        return super.rows<NodeT>(NodeStorage.listStatement(containerID, offset, limit))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createOrUpdateStatement(n: NodeT): QueryConfig[] {
        return [
            {
            text:`INSERT INTO nodes(id, container_id, metatype_id, metatype_name, graph_id,properties,original_data_id,data_source_id,type_mapping_transformation_id,import_data_id,data_staging_id,composite_original_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
ON CONFLICT (composite_original_id, data_source_id)
DO
UPDATE  SET container_id = $2, metatype_id = $3, metatype_name = $4, graph_id = $5, properties = $6, original_data_id = $7, data_source_id = $8, type_mapping_transformation_id = $9, import_data_id = $10, data_staging_id = $11, composite_original_id = $12, modified_at = NOW()`,
            values: [n.id, n.container_id, n.metatype_id, n.metatype_name, n.graph_id,  n.properties, n.original_data_id, n.data_source_id, n.type_mapping_transformation_id, n.import_data_id, n.data_staging_id, n.composite_original_id]
             }

        ]
    }

    private static retrieveStatement(nodeID: string): QueryConfig {
        return {
            text: `SELECT * FROM nodes WHERE id = $1 AND NOT archived`,
            values: [nodeID]
        }
    }

    private static domainRetrieveStatement(nodeID: string, containerID:string): QueryConfig {
        return {
            text: `SELECT * FROM nodes WHERE id = $1 AND container_id = $2 AND NOT archived`,
            values: [nodeID, containerID]
        }
    }

    // because the data source and data are so tightly intertwined, you must include both in order to pull a single
    // piece of data by original id
    private static retrieveByOriginalIDStatement(dataSourceID:string, originalID: string): QueryConfig {
        return {
            text: `SELECT * FROM nodes WHERE original_data_id = $1 AND data_source_id = $2 AND NOT archived`,
            values: [originalID, dataSourceID]
        }
    }

    private static fullUpdateStatement(n: NodeT): QueryConfig[] {
        return [{
            text: `UPDATE nodes SET container_id = $1, graph_id = $2,properties = $3, original_data_id = $4, data_source_id = $5, type_mapping_transformation_id = $6, modified_at = $7, deleted_at = $8, import_data_id = $10, data_staging_id = $11, composite_original_id = $12 WHERE id = $9`,
            values: [n.container_id, n.graph_id, n.properties,n.original_data_id, n.data_source_id, n.type_mapping_transformation_id, n.modified_at,n.deleted_at, n.id, n.import_data_id, n.data_staging_id, n.composite_original_id]
        }]
    }

    private static fullUpdateByCompositeOriginalIDStatement(n: NodeT): QueryConfig[] {
        return [{
            text: `UPDATE nodes SET container_id = $1, graph_id = $2, properties = $3, original_data_id = $4, data_source_id = $5, type_mapping_transformation_id = $6, modified_at = $7, deleted_at = $8, import_data_id = $11, data_staging_id = $12, composite_original_id = $13 WHERE composite_original_id = $13 AND data_source_id = $10`,
            values: [n.container_id, n.graph_id, n.properties,n.original_data_id, n.data_source_id, n.type_mapping_transformation_id, n.modified_at,n.deleted_at, n.original_data_id, n.data_source_id, n.import_data_id, n.data_staging_id, n.composite_original_id]
        }]
    }

    private static archiveStatement(nodeID: string): QueryConfig {
        return {
            text:`UPDATE nodes SET archived = true  WHERE id = $1`,
            values: [nodeID]
        }
    }

    private static deleteStatement(nodeID: string): QueryConfig {
        return {
            text:`DELETE FROM nodes WHERE id = $1`,
            values: [nodeID]
        }
    }

    private static listStatement(containerID: string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM nodes WHERE container_id = $1 AND NOT archived OFFSET $2 LIMIT $3`,
            values: [containerID, offset, limit]
        }
    }

    private static listByMetatypeIDStatement(metatypeID:string, offset:number, limit:number) {
        return {
            text:`SELECT * FROM nodes WHERE metatype_id = $1 AND NOT archived OFFSET $2 LIMIT $3`,
            values: [metatypeID, offset, limit]
        }
    }
}
