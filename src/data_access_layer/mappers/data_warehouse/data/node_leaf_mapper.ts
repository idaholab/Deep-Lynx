import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Result from '../../../../common_classes/result';
import {NodeLeaf} from '../../../../domain_objects/data_warehouse/data/node';

const format = require('pg-format');
const resultClass = NodeLeaf;

/*
    NodeLeafMapper extends the Postgres database Mapper class and allows the
    user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also try
    to avoid listing functions, and those are generally covered by the Repository
    class/interface as well.
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
            text: `WITH RECURSIVE related (container_id, origin_id, origin_metatype_id, origin_data_source_id, origin_import_data_id, origin_data_staging_id, 
                origin_type_mapping_transformation_id, origin_original_data_id, origin_properties, origin_metadata, origin_created_at, origin_modified_at, 
                origin_deleted_at, origin_created_by, origin_modified_by, origin_metatype_name, edge_id, edge_relationship_pair_id, edge_data_source_id, 
                edge_import_data_id, edge_data_staging_id, edge_type_mapping_transformation_id, edge_metadata, edge_created_at, edge_modified_at, 
                edge_deleted_at, edge_properties, edge_modified_by, edge_created_by, edge_relationship_name, edge_relationship_id, destination_id, 
                destination_metatype_id, destination_data_source_id, destination_import_data_id, destination_data_staging_id, 
                destination_type_mapping_transformation_id, destination_original_data_id, destination_properties, destination_metadata, 
                destination_created_at, destination_modified_at, destination_deleted_at, destination_created_by, destination_modified_by, 
                destination_metatype_name, depth) AS (
            SELECT o.container_id, o.id, o.metatype_id, o.data_source_id, o.import_data_id, o.data_staging_id, o.type_mapping_transformation_id, 
            o.original_data_id, o.properties, o.metadata, o.created_at, o.modified_at, o.deleted_at, o.created_by, o.modified_by, o.metatype_name, e.id, 
            e.relationship_pair_id, e.data_source_id, e.import_data_id, e.data_staging_id, e.type_mapping_transformation_id, e.metadata, e.created_at, 
            e.modified_at, e.deleted_at, e.properties, e.modified_by, e.created_by, e.metatype_relationship_name, e.relationship_id, d.id, d.metatype_id, 
            d.data_source_id, d.import_data_id, d.data_staging_id, d.type_mapping_transformation_id, d.original_data_id, d.properties, d.metadata, 
            d.created_at, d.modified_at, d.deleted_at, d.created_by, d.modified_by, d.metatype_name, 1
            FROM current_nodes o
                JOIN current_edges e
                    ON o.id IN (e.origin_id, e.destination_id)
                JOIN current_nodes d
                    ON d.id IN (e.origin_id, e.destination_id)
                    AND d.id != o.id
            WHERE o.id = $1
            UNION ALL
            SELECT r.container_id, r.destination_id, r.destination_metatype_id, r.destination_data_source_id, r.destination_import_data_id, 
            r.destination_data_staging_id, r.destination_type_mapping_transformation_id, r.destination_original_data_id, r.destination_properties, 
            r.destination_metadata, r.destination_created_at, r.destination_modified_at, r.destination_deleted_at, r.destination_created_by, 
            r.destination_modified_by, r.destination_metatype_name, e.id, e.relationship_pair_id, e.data_source_id, e.import_data_id, e.data_staging_id, 
            e.type_mapping_transformation_id, e.metadata, e.created_at, e.modified_at, e.deleted_at, e.properties, e.modified_by, e.created_by, 
            e.metatype_relationship_name, e.relationship_id, d.id, d.metatype_id, d.data_source_id, d.import_data_id, d.data_staging_id, 
            d.type_mapping_transformation_id, d.original_data_id, d.properties, d.metadata, d.created_at, d.modified_at, d.deleted_at, d.created_by, 
            d.modified_by, d.metatype_name, r.depth+1
            FROM related r
                JOIN current_edges e
                    ON r.destination_id IN (e.origin_id, e.destination_id)
                JOIN current_nodes d
                    ON d.id IN (e.origin_id, e.destination_id)
                    AND d.id != r.origin_id AND d.id != r.destination_id
        ) SELECT * FROM related WHERE container_id = $2 AND depth <= $3`,
            values: [nodeID, container_id, depth],
        };
    }
}