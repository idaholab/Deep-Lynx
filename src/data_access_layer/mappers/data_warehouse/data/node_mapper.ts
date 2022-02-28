import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Node, {NodeLeaf} from '../../../../domain_objects/data_warehouse/data/node';
import {NodeFile} from '../../../../domain_objects/data_warehouse/data/file';

const format = require('pg-format');
const resultClass = Node;

/*
    NodeMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class NodeMapper extends Mapper {
    public static tableName = 'nodes';
    public static viewName = 'current_nodes';

    private static instance: NodeMapper;

    public static get Instance(): NodeMapper {
        if (!NodeMapper.instance) {
            NodeMapper.instance = new NodeMapper();
        }

        return NodeMapper.instance;
    }

    // In order to facilitate updates from external data sources (after having
    // been processed) we have modified the standard create statements to also
    // potentially update records if the composite id and data source match a known
    // record
    public async CreateOrUpdateByCompositeID(userID: string, node: Node, transaction?: PoolClient): Promise<Result<Node>> {
        const r = await super.run(this.createOrUpdateStatement(userID, node), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public BulkCreateOrUpdateByCompositeID(userID: string, nodes: Node[], transaction?: PoolClient): Promise<Result<Node[]>> {
        return super.run(this.createOrUpdateStatement(userID, ...nodes), {
            transaction,
            resultClass,
        });
    }

    public async Update(userID: string, node: Node, transaction?: PoolClient): Promise<Result<Node>> {
        const r = await super.run(this.fullUpdateStatement(userID, node), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public BulkUpdate(userID: string, nodes: Node[], transaction?: PoolClient): Promise<Result<Node[]>> {
        return super.run(this.fullUpdateStatement(userID, ...nodes), {
            transaction,
            resultClass,
        });
    }

    public AddFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.addFile(id, fileID));
    }

    public BulkAddFile(nodeFiles: NodeFile[], transaction?: PoolClient): Promise<Result<NodeFile[]>> {
        return super.run(this.bulkAddFileStatement(nodeFiles), {
            transaction,
            resultClass: NodeFile,
        });
    }

    public RemoveFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.removeFile(id, fileID));
    }

    public async Delete(id: string, transaction?: PoolClient): Promise<Result<boolean>> {
        const edgesDeleted = await super.runStatement(this.deleteEdgesStatement(id), {transaction});
        if (edgesDeleted.isError) return Promise.resolve(Result.Pass(edgesDeleted));

        return super.runStatement(this.deleteStatement(id), {transaction});
    }

    public async Retrieve(id: string, transaction?: PoolClient): Promise<Result<Node>> {
        return super.retrieve(this.retrieveStatement(id), {
            transaction,
            resultClass,
        });
    }

    public async RetrieveByCompositeOriginalID(originalID: string, dataSourceID: string, metatypeID: string, transaction?: PoolClient): Promise<Result<Node>> {
        return super.retrieve(this.retrieveByCompositeOriginalIDStatement(dataSourceID, metatypeID, originalID), {transaction, resultClass});
    }

    public async DomainRetrieve(id: string, containerID: string, transaction?: PoolClient): Promise<Result<Node>> {
        return super.retrieve(this.domainRetrieveStatement(id, containerID), {
            transaction,
            resultClass,
        });
    }

    // This should return a node and all connected nodes and connecting edges for n layers.
    public async RetrieveNthNodes(id: string, depth: string, transaction?: PoolClient): Promise<Result<NodeLeaf[]>> {
        return super.rows(this.retrieveNthNodesStatement(id, depth), {
            transaction,
            resultClass: NodeLeaf,
        });
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createOrUpdateStatement(userID: string, ...nodes: Node[]): string {
        const text = `INSERT INTO nodes(
                  container_id,
                  metatype_id,
                  properties,
                  original_data_id,
                  data_source_id,
                  type_mapping_transformation_id,
                  import_data_id,
                  data_staging_id,
                  metadata,
                  created_by,
                  modified_by) VALUES %L
                  ON CONFLICT(created_at, id) DO UPDATE SET
                      properties = EXCLUDED.properties,
                      metadata = EXCLUDED.metadata
                    WHERE EXCLUDED.id = nodes.id 
                   RETURNING *`;

        const values = nodes.map((n) => [
            n.container_id,
            n.metatype!.id,
            JSON.stringify(n.properties),
            n.original_data_id,
            n.data_source_id,
            n.type_mapping_transformation_id,
            n.import_data_id,
            n.data_staging_id,
            JSON.stringify(n.metadata),
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...nodes: Node[]): string {
        const text = `INSERT INTO nodes(
            id,
            container_id,
            metatype_id,
            properties,
            original_data_id,
            data_source_id,
            type_mapping_transformation_id,
            import_data_id,
            data_staging_id,
            metadata,
            created_by,
            modified_by) VALUES %L RETURNING *`;

        const values = nodes.map((n) => [
            n.id,
            n.container_id,
            n.metatype!.id,
            JSON.stringify(n.properties),
            n.original_data_id,
            n.data_source_id,
            n.type_mapping_transformation_id,
            n.import_data_id,
            n.data_staging_id,
            JSON.stringify(n.metadata),
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private retrieveStatement(nodeID: string): QueryConfig {
        return {
            text: `SELECT * FROM current_nodes WHERE id = $1`,
            values: [nodeID],
        };
    }

    private domainRetrieveStatement(nodeID: string, containerID: string): QueryConfig {
        return {
            text: `SELECT * FROM current_nodes WHERE id = $1 AND container_id = $2`,
            values: [nodeID, containerID],
        };
    }

    // because the data source and data are so tightly intertwined, you must include both in order to pull a single
    // piece of data by original id
    private retrieveByCompositeOriginalIDStatement(dataSourceID: string, metatypeID: string, originalID: string): QueryConfig {
        return {
            text: `SELECT * FROM current_nodes WHERE original_data_id = $1 AND data_source_id = $2 AND metatype_id = $3`,
            values: [originalID, dataSourceID, metatypeID],
        };
    }

    private deleteStatement(nodeID: string): QueryConfig {
        return {
            text: `UPDATE nodes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
            values: [nodeID],
        };
    }

    private deleteEdgesStatement(nodeID: string): QueryConfig {
        return {
            text: `UPDATE edges SET deleted_at = NOW() WHERE (origin_id = $1 OR destination_id = $1) AND deleted_at IS NULL`,
            values: [nodeID],
        };
    }

    private addFile(nodeID: string, fileID: string): QueryConfig {
        return {
            text: `INSERT INTO node_files(node_id, file_id) VALUES ($1, $2)`,
            values: [nodeID, fileID],
        };
    }

    private bulkAddFileStatement(nodeFiles: NodeFile[]): string {
        const text = `INSERT INTO node_files(
                       node_id,
                       file_id) VALUES %L RETURNING *`;

        const values = nodeFiles.map((nf) => [nf.node_id, nf.file_id]);

        return format(text, values);
    }

    private removeFile(nodeID: string, fileID: string): QueryConfig {
        return {
            text: `DELETE FROM node_files WHERE node_id = $1 AND file_id = $2`,
            values: [nodeID, fileID],
        };
    }

    // This should return a node and all connected nodes and connecting edges for n layers.
    private retrieveNthNodesStatement(nodeID: string, depth: string): QueryConfig {
        return {
            text: `WITH RECURSIVE related (origin_id, origin_container_id, origin_metatype_id, origin_data_source_id, origin_import_data_id,
                                            origin_data_staging_id, origin_type_mapping_transformation_id, origin_original_data_id, origin_properties,
                                            origin_metadata, origin_created_at, origin_modified_at, origin_deleted_at, origin_created_by, origin_modified_by,
                                            origin_metatype_name, edge_id, edge_container_id, edge_relationship_pair_id, edge_data_source_id,
                                            edge_import_data_id, edge_data_staging_id, edge_type_mapping_transformation_id, edge_metadata,
                                            edge_created_at, edge_modified_at, edge_deleted_at, edge_properties, edge_modified_by, edge_created_by,
                                            destination_id, destination_container_id, destination_metatype_id, destination_data_source_id, destination_import_data_id, destination_data_staging_id,
                                            destination_type_mapping_transformation_id, destination_original_data_id, destination_properties, destination_metadata, destination_created_at,
                                            destination_modified_at, destination_deleted_at, destination_created_by, destination_modified_by, destination_metatype_name, lvl) AS (
                    SELECT o.id, o.container_id, o.metatype_id, o.data_source_id, o.import_data_id, o.data_staging_id, o.type_mapping_transformation_id,
                    o.original_data_id, o.properties, o.metadata, o.created_at, o.modified_at, o.deleted_at, o.created_by, o.modified_by, o.metatype_name,
                    e.id, e.container_id, e.relationship_pair_id, e.data_source_id, e.import_data_id, e.data_staging_id, e.type_mapping_transformation_id,
                    e.metadata, e.created_at, e.modified_at, e.deleted_at, e.properties, e.modified_by, e.created_by, d.id, d.container_id, d.metatype_id,
                    d.data_source_id, d.import_data_id, d.data_staging_id, d.type_mapping_transformation_id, d.original_data_id, d.properties, d.metadata,
                    d.created_at, d.modified_at, d.deleted_at, d.created_by, d.modified_by, d.metatype_name, 1
                    FROM current_nodes o
                        JOIN edges e
                            ON o.id IN (e.origin_id, e.destination_id)
                        JOIN current_nodes d
                            ON d.id IN (e.origin_id, e.destination_id)
                            AND d.id != o.id
                    WHERE o.id = $1
                    UNION ALL
                    SELECT r.destination_id, r.destination_container_id, r.destination_metatype_id, r.destination_data_source_id, r.destination_import_data_id, r.destination_data_staging_id,
                    r.destination_type_mapping_transformation_id, r.destination_original_data_id, r.destination_properties, r.destination_metadata, r.destination_created_at, r.destination_modified_at,
                    r.destination_deleted_at, r.destination_created_by, r.destination_modified_by, r.destination_metatype_name, e.id, e.container_id, e.relationship_pair_id, e.data_source_id,
                    e.import_data_id, e.data_staging_id, e.type_mapping_transformation_id, e.metadata, e.created_at, e.modified_at, e.deleted_at, e.properties,
                    e.modified_by, e.created_by, d.id, d.container_id, d.metatype_id, d.data_source_id, d.import_data_id, d.data_staging_id,
                    d.type_mapping_transformation_id, d.original_data_id, d.properties, d.metadata, d.created_at, d.modified_at, d.deleted_at, d.created_by,
                    d.modified_by, d.metatype_name, r.lvl+1
                    FROM related r
                        JOIN edges e
                            ON r.destination_id IN (e.origin_id, e.destination_id)
                        JOIN current_nodes d
                            ON d.id IN (e.origin_id, e.destination_id)
                            AND d.id != r.origin_id AND d.id != r.destination_id
                    ) SELECT * FROM related WHERE lvl <= $2;`,
            values: [nodeID, depth],
        };
    }
}
