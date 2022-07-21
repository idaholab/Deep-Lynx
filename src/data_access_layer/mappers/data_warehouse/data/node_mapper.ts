import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Node, {NodeTransformation} from '../../../../domain_objects/data_warehouse/data/node';
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
                  modified_by,
                  created_at) VALUES %L
                  ON CONFLICT(created_at, id) DO UPDATE SET
                      properties = EXCLUDED.properties,
                      metadata = EXCLUDED.metadata,
                      deleted_at = EXCLUDED.deleted_at
                  WHERE EXCLUDED.id = nodes.id 
                   RETURNING *`;

        const values = nodes.map((n) => [
            n.container_id,
            n.metatype ? n.metatype.id : n.metatype_id,
            JSON.stringify(n.properties),
            n.original_data_id,
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
            n.metatype ? n.metatype.id : n.metatype_id,
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
}
