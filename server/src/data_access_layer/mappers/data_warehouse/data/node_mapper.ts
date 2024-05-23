import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Node, {NodeTransformation} from '../../../../domain_objects/data_warehouse/data/node';
import {NodeFile} from '../../../../domain_objects/data_warehouse/data/file';

import {v4 as uuidv4} from 'uuid';
const format = require('pg-format');

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
    public resultClass = Node;
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
    public async CreateOrUpdateByCompositeID(userID: string, node: Node, transaction?: PoolClient, merge = false): Promise<Result<Node>> {
        const r = await super.run(this.createOrUpdateStatement(userID, merge, node), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public BulkCreateOrUpdateByCompositeID(userID: string, nodes: Node[], transaction?: PoolClient, merge = false): Promise<Result<Node[]>> {
        return super.run(this.createOrUpdateStatement(userID, merge, ...nodes), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async Update(userID: string, node: Node, transaction?: PoolClient, merge = false): Promise<Result<Node>> {
        const r = await super.run(this.fullUpdateStatement(userID, merge, node), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public BulkUpdate(userID: string, nodes: Node[], merge: boolean, transaction?: PoolClient): Promise<Result<Node[]>> {
        return super.run(this.fullUpdateStatement(userID, merge, ...nodes), {
            transaction,
            resultClass: this.resultClass,
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

    public AddTransformation(id: string, transformationID: string): Promise<Result<boolean>> {
        return super.runStatement(this.addTransformation(id, transformationID));
    }

    public BulkAddTransformation(nodeTransformations: NodeTransformation[], transaction?: PoolClient): Promise<Result<NodeTransformation[]>> {
        return super.run(this.bulkAddTransformationStatement(nodeTransformations), {
            transaction,
            resultClass: NodeTransformation,
        });
    }

    public RemoveTransformation(id: string, transformationID: string): Promise<Result<boolean>> {
        return super.runStatement(this.removeFile(id, transformationID));
    }

    public AttachTagsForImport(importIDs: string[]): Promise<Result<boolean>> {
        return super.runStatement(this.attachTagsForImport(importIDs));
    }

    public AttachFilesForImport(importIDs: string[]): Promise<Result<boolean>> {
        return super.runStatement(this.attachFilesForImport(importIDs));
    }

    // this function covers moving and deleting them from the temp table. Since we don't want to leave anything hanging
    // we wrap this in a transaction
    public MoveFromTemp(importIDs: string[]): Promise<Result<boolean>> {
        return super.runAsTransaction(this.deduplicateFromTemp(importIDs), this.moveFromTemp(importIDs), this.deleteFromTemp(importIDs));
    }

    public ListTransformationsForNode(nodeID: string): Promise<Result<NodeTransformation[]>> {
        return super.rows<NodeTransformation>(this.listTransformationsStatement(nodeID), {
            resultClass: NodeTransformation,
        });
    }

    public async Delete(id: string, transaction?: PoolClient): Promise<Result<boolean>> {
        const edgesDeleted = await super.runStatement(this.deleteEdgesStatement(id), {transaction});
        if (edgesDeleted.isError) return Promise.resolve(Result.Pass(edgesDeleted));

        return super.runStatement(this.deleteStatement(id), {transaction});
    }

    public async Retrieve(id: string, transaction?: PoolClient): Promise<Result<Node>> {
        return super.retrieve(this.retrieveStatement(id), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async RetrieveHistory(id: string, transaction?: PoolClient): Promise<Result<Node[]>> {
        return super.rows<Node>(this.retrieveHistoryStatement(id), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async RetrieveRawDataHistory(id: string, transaction?: PoolClient): Promise<Result<Node[]>> {
        return super.rows<Node>(this.retrieveRawDataHistoryStatement(id), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async RetrieveByCompositeOriginalID(originalID: string, dataSourceID: string, metatypeID: string, transaction?: PoolClient): Promise<Result<Node>> {
        return super.retrieve(this.retrieveByCompositeOriginalIDStatement(dataSourceID, metatypeID, originalID), {transaction, resultClass: this.resultClass});
    }

    public async DomainRetrieve(id: string, containerID: string, transaction?: PoolClient): Promise<Result<Node>> {
        return super.retrieve(this.domainRetrieveStatement(id, containerID), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async RowCount(containerID: string): Promise<Result<number>> {
        return super.retrieve(this.getRowCount(containerID));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createOrUpdateStatement(userID: string, merge = false, ...nodes: Node[]): string {
        // similar to the node_insert_trigger, join to nodes on original_data_id, metatype_id, and data_source_id
        // in order to perform a merge on a node for which we do not have a DeepLynx ID (data from type mappings)
        const text = merge
            ? `INSERT INTO nodes(
                    container_id,
                    metatype_id,
                    properties,
                    metadata_properties,
                    original_data_id,
                    data_source_id,
                    type_mapping_transformation_id,
                    import_data_id,
                    data_staging_id,
                    metadata,
                    created_by,
                    modified_by,
                    created_at)
               SELECT
                   u.container_id::int8,
                   u.metatype_id::int8,
                   n.properties::jsonb || u.properties::jsonb,
                   n.metadata_properties::jsonb || u.metadata_properties::jsonb,
                   u.original_data_id::text,
                   u.data_source_id::int8,
                   u.type_mapping_transformation_id::int8,
                   u.import_data_id::int8,
                   u.data_staging_id::uuid,
                   u.metadata::jsonb,
                   u.created_by::text,
                   u.modified_by::text,
                   u.created_at::TIMESTAMP
               FROM (VALUES %L) AS u(
                     container_id,
                     metatype_id,
                     properties,
                     metadata_properties,
                     original_data_id,
                     data_source_id,
                     type_mapping_transformation_id,
                     import_data_id,
                     data_staging_id,
                     metadata,
                     created_by,
                     modified_by,
                     created_at)
                LEFT JOIN nodes n ON u.original_data_id = n.original_data_id
                   AND u.metatype_id::int8 = n.metatype_id
                   AND u.data_source_id::int8 = n.data_source_id
                WHERE n.created_at < u.created_at::TIMESTAMP
                ORDER BY n.created_at DESC LIMIT 1
                  ON CONFLICT(created_at, original_data_id, container_id, data_source_id) DO UPDATE SET
                      properties = nodes.properties || EXCLUDED.properties,
                      metadata = EXCLUDED.metadata,
                      metadata_properties = nodes.metadata_properties || EXCLUDED.metadata_properties,
                      deleted_at = EXCLUDED.deleted_at
                  WHERE EXCLUDED.original_data_id = nodes.original_data_id AND EXCLUDED.container_id = nodes.container_id AND EXCLUDED.data_source_id = nodes.data_source_id AND EXCLUDED.properties IS DISTINCT FROM nodes.properties
                        OR EXCLUDED.metadata_properties IS DISTINCT FROM nodes.metadata_properties
                   RETURNING *`
            : `INSERT INTO nodes(
                  container_id,
                  metatype_id,
                  properties,
                  metadata_properties,
                  original_data_id,
                  data_source_id,
                  type_mapping_transformation_id,
                  import_data_id,
                  data_staging_id,
                  metadata,
                  created_by,
                  modified_by,
                  created_at) VALUES %L
                  ON CONFLICT(created_at, original_data_id, container_id, data_source_id) DO UPDATE SET
                      properties = EXCLUDED.properties,
                      metadata = EXCLUDED.metadata,
                      deleted_at = EXCLUDED.deleted_at
                  WHERE EXCLUDED.original_data_id = nodes.original_data_id AND EXCLUDED.container_id = nodes.container_id AND EXCLUDED.data_source_id = nodes.data_source_id AND (EXCLUDED.properties IS DISTINCT FROM nodes.properties
                        OR EXCLUDED.metadata_properties IS DISTINCT FROM nodes.metadata_properties)
                   RETURNING *`;

        const values = nodes.map((n) => [
            n.container_id,
            n.metatype ? n.metatype.id : n.metatype_id,
            JSON.stringify(n.properties),
            JSON.stringify(n.metadata_properties),
            n.original_data_id ? n.original_data_id : uuidv4(),
            n.data_source_id,
            n.type_mapping_transformation_id,
            n.import_data_id,
            n.data_staging_id,
            JSON.stringify(n.metadata),
            userID,
            userID,
            n.created_at ? n.created_at : new Date().toISOString(),
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, merge: boolean, ...nodes: Node[]): string {
        // the merge query needs to account for merging properties and metadata_properties
        // as well as ensuring the node with which a merge occurs is the directly preceding
        // version of the node, as the created_at can be provided by the user
        const text = merge
            ? `INSERT INTO nodes(
                  id,
                  container_id,
                  metatype_id,
                  properties,
                  metadata_properties,
                  original_data_id,
                  data_source_id,
                  type_mapping_transformation_id,
                  import_data_id,
                  data_staging_id,
                  metadata,
                  created_by,
                  modified_by,
                  created_at)
         SELECT
                  u.id::int8,
                  u.container_id::int8,
                  u.metatype_id::int8,
                  n.properties::jsonb || u.properties::jsonb,
                  n.metadata_properties::jsonb || u.metadata_properties::jsonb,
                  u.original_data_id::text,
                  u.data_source_id::int8,
                  u.type_mapping_transformation_id::int8,
                  u.import_data_id::int8,
                  u.data_staging_id::uuid,
                  u.metadata::jsonb,
                  u.created_by::text,
                  u.modified_by::text,
                  u.created_at::TIMESTAMP
           FROM (VALUES %L) AS u(
                  id,
                  container_id,
                  metatype_id,
                  properties,
                  metadata_properties,
                  original_data_id,
                  data_source_id,
                  type_mapping_transformation_id,
                  import_data_id,
                  data_staging_id,
                  metadata,
                  created_by,
                  modified_by,
                  created_at)
            LEFT JOIN nodes n ON u.id::int8 = n.id
            WHERE n.created_at < u.created_at::TIMESTAMP
            ORDER BY n.created_at DESC LIMIT 1
            ON CONFLICT(created_at, original_data_id, container_id, data_source_id) DO UPDATE SET
                   properties = nodes.properties || EXCLUDED.properties,
                   metadata = EXCLUDED.metadata,
                   metadata_properties = nodes.metadata_properties || EXCLUDED.metadata_properties,
                   deleted_at = EXCLUDED.deleted_at
            WHERE EXCLUDED.original_data_id = nodes.original_data_id AND EXCLUDED.container_id = nodes.container_id AND EXCLUDED.data_source_id = nodes.data_source_id AND (EXCLUDED.properties IS DISTINCT FROM nodes.properties
                OR EXCLUDED.metadata_properties IS DISTINCT FROM nodes.metadata_properties)
            RETURNING *`
            : `INSERT INTO nodes(
                  id,
                  container_id,
                  metatype_id,
                  properties,
                  metadata_properties,
                  original_data_id,
                  data_source_id,
                  type_mapping_transformation_id,
                  import_data_id,
                  data_staging_id,
                  metadata,
                  created_by,
                  modified_by,
                  created_at) VALUES %L RETURNING *`;

        const values = nodes.map((n) => [
            n.id,
            n.container_id,
            n.metatype ? n.metatype.id : n.metatype_id,
            JSON.stringify(n.properties),
            JSON.stringify(n.metadata_properties),
            n.original_data_id ? n.original_data_id : uuidv4(),
            n.data_source_id,
            n.type_mapping_transformation_id,
            n.import_data_id,
            n.data_staging_id,
            JSON.stringify(n.metadata),
            userID,
            userID,
            n.created_at ? n.created_at : new Date().toISOString(),
        ]);

        return format(text, values);
    }

    private retrieveStatement(nodeID: string): QueryConfig {
        return {
            text: `SELECT DISTINCT ON (nodes.id) nodes.*, 
                    metatypes.name AS metatype_name,
                    metatypes.uuid AS metatype_uuid
                FROM nodes
                    LEFT JOIN metatypes ON metatypes.id = nodes.metatype_id
                WHERE nodes.deleted_at IS NULL
                AND nodes.id = $1
                ORDER BY nodes.id, nodes.created_at DESC`,
            values: [nodeID],
        };
    }

    // retrieves all versions of a node
    private retrieveHistoryStatement(nodeID: string): QueryConfig {
        return {
            text: `SELECT nodes.*, metatypes.name as metatype_name
            FROM nodes LEFT JOIN metatypes ON nodes.metatype_id = metatypes.id
            WHERE nodes.id = $1 ORDER BY nodes.created_at ASC`,
            values: [nodeID],
        };
    }

    // retrieves node history with raw data records attached
    private retrieveRawDataHistoryStatement(nodeID: string): QueryConfig {
        return {
            text: `SELECT nodes.*, metatypes.name as metatype_name, data_staging.data AS raw_data_properties
            FROM nodes LEFT JOIN metatypes ON nodes.metatype_id = metatypes.id
            LEFT JOIN data_staging ON nodes.data_staging_id = data_staging.id
            WHERE nodes.id = $1 ORDER BY nodes.created_at ASC`,
            values: [nodeID],
        };
    }

    private domainRetrieveStatement(nodeID: string, containerID: string): QueryConfig {
        return {
            text: `SELECT DISTINCT ON (nodes.id) nodes.*, 
                    metatypes.name AS metatype_name,
                    metatypes.uuid AS metatype_uuid
                FROM nodes
                    LEFT JOIN metatypes ON metatypes.id = nodes.metatype_id
                WHERE nodes.deleted_at IS NULL
                AND nodes.id = $1
                AND nodes.container_id = $2
                ORDER BY nodes.id, nodes.created_at DESC`,
            values: [nodeID, containerID],
        };
    }

    // because the data source and data are so tightly intertwined, you must include both in order to pull a single
    // piece of data by original id
    private retrieveByCompositeOriginalIDStatement(dataSourceID: string, metatypeID: string, originalID: string): QueryConfig {
        return {
            text: `SELECT DISTINCT ON (nodes.id) nodes.*, 
                    metatypes.name AS metatype_name,
                    metatypes.uuid AS metatype_uuid
                FROM nodes
                    LEFT JOIN metatypes ON metatypes.id = nodes.metatype_id
                WHERE nodes.deleted_at IS NULL
                AND nodes.original_data_id = $1
                AND nodes.data_source_id = $2
                AND nodes.metatype_id = $3
                ORDER BY nodes.id, nodes.created_at DESC`,
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

    private addTransformation(nodeID: string, transformationID: string): QueryConfig {
        return {
            text: `INSERT INTO node_transformations(node_id, transformation_id) VALUES ($1, $2)`,
            values: [nodeID, transformationID],
        };
    }

    private bulkAddTransformationStatement(nodeTransformations: NodeTransformation[]): string {
        const text = `INSERT INTO node_transformations(
                       node_id,
                       transformation_id) VALUES %L 
                       ON CONFLICT(node_id, transformation_id) DO NOTHING
                       RETURNING *`;

        const values = nodeTransformations.map((nt) => [nt.node_id, nt.transformation_id]);

        return format(text, values);
    }

    private attachTagsForImport(importIDs: string[]): string {
        const text = `
            INSERT INTO node_tags
            SELECT nodes.id, tags.id
            FROM nodes
                     LEFT JOIN type_mapping_transformations ts ON ts.id = nodes.type_mapping_transformation_id
                     LEFT JOIN tags ON tags.id IN (SELECT id::bigint FROM jsonb_to_recordset(ts.tags) AS x("id" text))
            WHERE nodes.import_data_id IN (%L)`;
        const values = [...importIDs];

        return format(text, values);
    }

    private attachFilesForImport(importIDs: string[]): string {
        const text = `
            INSERT INTO node_files
            SELECT nodes.id, files.id
            FROM nodes
                     LEFT JOIN data_staging ON data_staging.id = nodes.data_staging_id
                     LEFT JOIN data_staging_files ON data_staging_files.data_staging_id = data_staging.id
                     LEFT JOIN files ON files.id = data_staging_files.file_id
            WHERE nodes.import_data_id IN (%L)`;
        const values = [...importIDs];

        return format(text, values);
    }

    private deduplicateFromTemp(importIDs: string[]): string {
        const text = `DELETE FROM nodes_temp WHERE import_data_id IN(%L) AND id IN(SELECT id FROM 
              (SELECT id, ROW_NUMBER() OVER 
                (partition BY original_data_id, data_source_id, created_at,container_id ORDER BY created_at DESC) AS rnum 
              FROM nodes_temp) t
            WHERE t.rnum > 1)`;
        const values = [...importIDs];

        return format(text, values);
    }

    private moveFromTemp(importIDs: string[]): string {
        const text = `
       INSERT INTO nodes(
           original_data_id, 
           data_source_id, 
           created_at,
           container_id, 
           metatype_id,
           import_data_id,
           type_mapping_transformation_id,
           properties,
           metadata,
           modified_at,
           deleted_at,
           created_by,
           modified_by,
           data_staging_id,
           metadata_properties)
        SELECT original_data_id, 
               data_source_id, 
               created_at,
               container_id, 
               metatype_id,
               import_data_id,
               type_mapping_transformation_id,
               properties,
               metadata,
               modified_at,
               deleted_at,
               created_by,
               modified_by,
               data_staging_id,
               metadata_properties FROM nodes_temp WHERE import_data_id IN(%L);`;

        const values = [...importIDs];

        return format(text, values);
    }

    private deleteFromTemp(importIDs: string[]): string {
        const text = `DELETE FROM nodes_temp WHERE import_data_id IN(%L)`;
        const values = [...importIDs];

        return format(text, values);
    }

    private removeTransformation(nodeID: string, transformationID: string): QueryConfig {
        return {
            text: `DELETE FROM node_transformations WHERE node_id = $1 AND transformation_id = $2`,
            values: [nodeID, transformationID],
        };
    }

    private listTransformationsStatement(nodeID: string): QueryConfig {
        return {
            text: `SELECT node_transformations.*, type_mapping_transformations.name as name
             FROM node_transformations 
             LEFT JOIN type_mapping_transformations ON type_mapping_transformations.id = node_transformations.transformation_id
             WHERE node_id = $1`,
            values: [nodeID],
        };
    }

    private getRowCount(containerID: string): QueryConfig {
        return format(`SELECT COUNT(*) FROM nodes WHERE container_id = (%L)`, containerID);
    }
}
