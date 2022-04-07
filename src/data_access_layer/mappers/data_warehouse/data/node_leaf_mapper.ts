import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Result from '../../../../common_classes/result';
import NodeLeaf from '../../../../domain_objects/data_warehouse/data/node_leaf';

const format = require('pg-format');
const resultClass = NodeLeaf;

/*
    NodeLeafMapper extends the Postgres database Mapper class and allows the
    NodeLeaf structure to be fetched from the database. Unlike other mapper
    structures in Deep Lynx, the NodeLeafMapper is used exclusively to fetch
    data instead of creating, updating, or deleting it, as its structure does
    not represent any one table in the database but a complex fetched result
    that combines data from several tables. The mapper's primary function is
    retrieving NodeLeaf objects.
*/

export default class NodeLeafMapper extends Mapper {
    public static tableName = 'nodes';
    public static viewName = 'current_nodes';

    private static instance: NodeLeafMapper;

    public static get Instance(): NodeLeafMapper {
        if (!NodeLeafMapper.instance) {
            NodeLeafMapper.instance = new NodeLeafMapper();
        }

        return NodeLeafMapper.instance;
    }

    // this mapper and the corresponding repository are primarily for retrieval
    // and filtering of NodeLeaf objects and likely won't be used for CRUD operations
    // other than reads.

    public async RetrieveNthNodes(id: string, container_id: string, depth: string, transaction?: PoolClient): Promise<Result<NodeLeaf[]>> {
        return super.rows(this.retrieveNthNodesStatement(id, container_id, depth), {
            transaction,
            resultClass
        });
    }

    // query-building function: returns a list of node-edge-node pairs (NodeLeafs)
    private retrieveNthNodesStatement(nodeID: string, container_id: string, depth: string): QueryConfig {
        return {
            text: `SELECT * FROM
            (WITH RECURSIVE search_graph(
                origin_id, origin_metatype_id, origin_metatype_name, origin_properties, origin_data_source,
                origin_metadata, origin_created_by, origin_created_at, origin_modified_by, origin_modified_at,
                edge_id, relationship_name, edge_properties, relationship_pair_id, relationship_id,
                edge_data_source, edge_metadata, edge_created_by, edge_created_at, edge_modified_by,
                edge_modified_at, destination_id, destination_metatype_id, destination_metatype_name,
                destination_properties, destination_data_source, destination_metadata, destination_created_by,
                destination_created_at, destination_modified_by, destination_modified_at, depth, path
            ) AS (
                SELECT n1.id, n1.metatype_id, n1.metatype_name, n1.properties, n1.data_source_id,
                    n1.metadata, n1.created_by, n1.created_at, n1.modified_by, n1.modified_at,
                    g.id, g.metatype_relationship_name, g.properties, g.relationship_pair_id, g.relationship_id,
                    g.data_source_id, g.metadata, g.created_by, g.created_at, g.modified_at, g.modified_by,
                    n2.id, n2.metatype_id, n2.metatype_name, n2.properties, n2.data_source_id,
                    n2.metadata, n2.created_by, n2.created_at, n2.modified_by, n2.modified_at,
                    1 as depth, ARRAY[g.origin_id] AS path
                FROM current_edges g
                 LEFT JOIN current_nodes n1 ON n1.id IN (g.origin_id, g.destination_id)
                 LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id) AND n2.id != n1.id
                WHERE n1.id = $1 AND g.container_id = $2
            UNION
                SELECT sg.destination_id, sg.destination_metatype_id, sg.destination_metatype_name,
                    sg.destination_properties, sg.destination_data_source, sg.destination_metadata,
                    sg.destination_created_by, sg.destination_created_at, sg.destination_modified_by,
                    sg.destination_created_at, g.id, g.metatype_relationship_name, g.properties,
                    g.relationship_pair_id, g.relationship_id, g.data_source_id, g.metadata, g.created_by,
                    g.created_at, g.modified_at, g.modified_by, n2.id, n2.metatype_id, n2.metatype_name,
                    n2.properties, n2.data_source_id, n2.metadata, n2.created_by, n2.created_at, n2.modified_by,
                    n2.modified_at, sg.depth + 1, path || sg.destination_id
                FROM current_edges g INNER JOIN search_graph sg
                ON sg.destination_id IN (g.origin_id, g.destination_id) AND (sg.destination_id <> ALL(sg.path))
                 LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id)
                    AND n2.id NOT IN (sg.origin_id, sg.destination_id)
                 WHERE g.container_id = $2 AND sg.depth < $3
            ) SELECT * FROM search_graph
            WHERE (origin_id = ANY(path)) AND destination_id IS NOT NULL AND origin_id IS NOT NULL
            UNION
            (WITH RECURSIVE search_graph(
                origin_id, origin_metatype_id, origin_metatype_name, origin_properties, origin_data_source,
                origin_metadata, origin_created_by, origin_created_at, origin_modified_by, origin_modified_at,
                edge_id, relationship_name, edge_properties, relationship_pair_id, relationship_id,
                edge_data_source, edge_metadata, edge_created_by, edge_created_at, edge_modified_by,
                edge_modified_at, destination_id, destination_metatype_id, destination_metatype_name,
                destination_properties, destination_data_source, destination_metadata, destination_created_by,
                destination_created_at, destination_modified_by, destination_modified_at, depth, path
            ) AS (
                SELECT n2.id, n2.metatype_id, n2.metatype_name, n2.properties, n2.data_source_id,
                    n2.metadata, n2.created_by, n2.created_at, n2.modified_by, n2.modified_at,
                    g.id, g.metatype_relationship_name, g.properties, g.relationship_pair_id, g.relationship_id,
                    g.data_source_id, g.metadata, g.created_by, g.created_at, g.modified_at, g.modified_by,
                    n1.id, n1.metatype_id, n1.metatype_name, n1.properties, n1.data_source_id,
                    n1.metadata, n1.created_by, n1.created_at, n1.modified_by, n1.modified_at,
                    1 as depth, ARRAY[g.destination_id] AS path
                FROM current_edges g
                 LEFT JOIN current_nodes n1 ON n1.id IN (g.origin_id, g.destination_id)
                 LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id) AND n2.id != n1.id
                WHERE n2.id = $1 AND g.container_id = $2
            UNION
                SELECT sg.destination_id, sg.destination_metatype_id, sg.destination_metatype_name,
                    sg.destination_properties, sg.destination_data_source, sg.destination_metadata,
                    sg.destination_created_by, sg.destination_created_at, sg.destination_modified_by,
                    sg.destination_created_at, g.id, g.metatype_relationship_name, g.properties,
                    g.relationship_pair_id, g.relationship_id, g.data_source_id, g.metadata, g.created_by,
                    g.created_at, g.modified_at, g.modified_by, n2.id, n2.metatype_id, n2.metatype_name,
                    n2.properties, n2.data_source_id, n2.metadata, n2.created_by, n2.created_at, n2.modified_by,
                    n2.modified_at, sg.depth + 1, path || sg.destination_id
                FROM current_edges g INNER JOIN search_graph sg
                ON sg.destination_id IN (g.origin_id, g.destination_id) AND (sg.destination_id <> ALL(sg.path))
                 LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id)
                    AND n2.id NOT IN (sg.origin_id, sg.destination_id)
                 WHERE g.container_id = $2 AND sg.depth < $3
            ) SELECT * FROM search_graph
            WHERE (origin_id = ANY(path)) AND destination_id IS NOT NULL AND origin_id IS NOT NULL)) nodeleafs`,
            values: [nodeID, container_id, depth],
        };
    }
}