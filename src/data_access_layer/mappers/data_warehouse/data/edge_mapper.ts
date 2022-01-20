import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Result from '../../../../common_classes/result';
import Edge from '../../../../domain_objects/data_warehouse/data/edge';
import {EdgeFile} from '../../../../domain_objects/data_warehouse/data/file';

const format = require('pg-format');
const resultClass = Edge;

/*
    EdgeMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class EdgeMapper extends Mapper {
    public static tableName = 'edges';
    public static viewName = 'current_edges';

    private static instance: EdgeMapper;

    public static get Instance(): EdgeMapper {
        if (!EdgeMapper.instance) {
            EdgeMapper.instance = new EdgeMapper();
        }

        return EdgeMapper.instance;
    }

    // In order to facilitate updates from external data sources (after having
    // been processed) we have modified the standard create statements to also
    // potentially update records if the composite id and data source match a known
    // record
    public async Create(userID: string, edge: Edge, transaction?: PoolClient): Promise<Result<Edge>> {
        const r = await super.run(this.createStatement(userID, edge), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public BulkCreate(userID: string, edges: Edge[], transaction?: PoolClient): Promise<Result<Edge[]>> {
        return super.run(this.createStatement(userID, ...edges), {
            transaction,
            resultClass,
        });
    }

    public async Update(userID: string, edge: Edge, transaction?: PoolClient): Promise<Result<Edge>> {
        const r = await super.run(this.fullUpdateStatement(userID, edge), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public BulkUpdate(userID: string, edges: Edge[], transaction?: PoolClient): Promise<Result<Edge[]>> {
        return super.run(this.fullUpdateStatement(userID, ...edges), {
            transaction,
            resultClass,
        });
    }

    public Retrieve(id: string, transaction?: PoolClient): Promise<Result<Edge>> {
        return super.retrieve<Edge>(this.retrieveStatement(id), {
            transaction,
            resultClass,
        });
    }

    public AddFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.addFileStatement(id, fileID));
    }

    public BulkAddFile(edgeFiles: EdgeFile[], transaction?: PoolClient): Promise<Result<EdgeFile[]>> {
        return super.run(this.bulkAddFileStatement(edgeFiles), {
            transaction,
            resultClass: EdgeFile,
        });
    }

    public RemoveFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.removeFileStatement(id, fileID));
    }

    public Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    public RunEdgeLinker(): Promise<Result<boolean>> {
        return super.runStatement(this.linkEdgesStatement());
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...edges: Edge[]): string {
        const text = `INSERT INTO edges(
            container_id,
            relationship_pair_id,
            origin_id,
            destination_id,
            properties,
            data_source_id,
            type_mapping_transformation_id,
            origin_original_id,
            origin_metatype_id,
            origin_data_source_id,
            destination_original_id,
            destination_metatype_id,
            destination_data_source_id,
            import_data_id,
            data_staging_id,
            metadata,
            created_by,
            modified_by) VALUES %L RETURNING *`;

        const values = edges.map((e) => [
            e.container_id,
            e.relationship_pair_id,
            e.origin_id,
            e.destination_id,
            JSON.stringify(e.properties),
            e.data_source_id,
            e.type_mapping_transformation_id,
            e.origin_original_id,
            e.origin_metatype_id,
            e.origin_data_source_id,
            e.destination_original_id,
            e.destination_metatype_id,
            e.destination_data_source_id,
            e.import_data_id,
            e.data_staging_id,
            JSON.stringify(e.metadata),
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...edges: Edge[]): string {
        const text = `INSERT INTO edges(
            id,
            container_id,
            relationship_pair_id,
            origin_id,
            destination_id,
            properties,
            data_source_id,
            type_mapping_transformation_id,
            origin_original_id,
            origin_metatype_id,
            origin_data_source_id,
            destination_original_id,
            destination_metatype_id,
            destination_data_source_id,
            import_data_id,
            data_staging_id,
            metadata,
            created_by,
            modified_by) VALUES %L RETURNING *`;

        const values = edges.map((e) => [
            e.id,
            e.container_id,
            e.relationship_pair_id,
            e.origin_id,
            e.destination_id,
            JSON.stringify(e.properties),
            e.data_source_id,
            e.type_mapping_transformation_id,
            e.origin_original_id,
            e.origin_metatype_id,
            e.origin_data_source_id,
            e.destination_original_id,
            e.destination_metatype_id,
            e.destination_data_source_id,
            e.import_data_id,
            e.data_staging_id,
            JSON.stringify(e.metadata),
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM current_edges WHERE id = $1`,
            values: [id],
        };
    }

    private deleteStatement(edgeID: string): QueryConfig {
        return {
            text: `UPDATE edges SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
            values: [edgeID],
        };
    }

    private addFileStatement(edgeID: string, fileID: string): QueryConfig {
        return {
            text: `INSERT INTO edge_files(edge_id, file_id) VALUES ($1, $2)`,
            values: [edgeID, fileID],
        };
    }

    private bulkAddFileStatement(edgeFiles: EdgeFile[]): string {
        const text = `INSERT INTO edge_files(
                       edge_id,
                       file_id) VALUES %L RETURNING *`;

        const values = edgeFiles.map((ef) => [ef.edge_id, ef.file_id]);

        return format(text, values);
    }

    private removeFileStatement(edgeID: string, fileID: string): QueryConfig {
        return {
            text: `DELETE FROM edge_files WHERE edge_id = $1 AND file_id = $2`,
            values: [edgeID, fileID],
        };
    }

    // linkEdgesStatement runs a stored procedure on every row in the edges table that matches the WHERE statement
    // the stored procedure handles "orphaned" edges and attempts to connect them to their correct nodes based on
    // the composite id of the node's original id, data source id, and metatype id
    private linkEdgesStatement(): QueryConfig {
        return {
            text: `SELECT link_edge(edges.*) FROM edges WHERE origin_id IS NULL OR destination_id IS NULL`,
        };
    }
}
