import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Result from '../../../../common_classes/result';
import Edge from '../../../../domain_objects/data_warehouse/data/edge';
import {EdgeFile} from '../../../../domain_objects/data_warehouse/data/file';

const format = require('pg-format');

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
    public resultClass = Edge;
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
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public BulkCreate(userID: string, edges: Edge[], transaction?: PoolClient): Promise<Result<Edge[]>> {
        return super.run(this.createStatement(userID, ...edges), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async Update(userID: string, edge: Edge, transaction?: PoolClient): Promise<Result<Edge>> {
        const r = await super.run(this.fullUpdateStatement(userID, edge), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public BulkUpdate(userID: string, edges: Edge[], transaction?: PoolClient): Promise<Result<Edge[]>> {
        return super.run(this.fullUpdateStatement(userID, ...edges), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public Retrieve(id: string, transaction?: PoolClient): Promise<Result<Edge>> {
        return super.retrieve<Edge>(this.retrieveStatement(id), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async RetrieveHistory(id: string, transaction?: PoolClient): Promise<Result<Edge[]>> {
        return super.rows<Edge>(this.retrieveHistoryStatement(id), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async RetrieveRawDataHistory(id: string, transaction?: PoolClient): Promise<Result<Edge[]>> {
        return super.rows<Edge>(this.retrieveRawDataHistoryStatement(id), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public RetrieveByRelationship(origin: string, relationship: string, destination: string, transaction?: PoolClient): Promise<Result<Edge[]>> {
        return super.rows<Edge>(this.retrieveByRelationshipStatement(origin, relationship, destination), {
            transaction,
            resultClass: this.resultClass,
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
            metadata_properties,
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
            modified_by,
            created_at) VALUES %L 
            ON CONFLICT(container_id,relationship_pair_id,data_source_id,created_at, origin_id, destination_id) DO UPDATE SET
                properties = EXCLUDED.properties,
                metadata = EXCLUDED.metadata
            WHERE EXCLUDED.id = edges.id AND excluded.properties IS DISTINCT FROM edges.properties
            RETURNING *`;

        const values = edges.map((e) => [
            e.container_id,
            e.relationship_pair_id,
            e.origin_id,
            e.destination_id,
            JSON.stringify(e.properties),
            JSON.stringify(e.metadata_properties),
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
            e.created_at ? e.created_at : new Date(),
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
            metadata_properties,
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
            modified_by,
            created_at) VALUES %L RETURNING *`;

        const values = edges.map((e) => [
            e.id,
            e.container_id,
            e.relationship_pair_id,
            e.origin_id,
            e.destination_id,
            JSON.stringify(e.properties),
            JSON.stringify(e.metadata_properties),
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
            e.created_at ? e.created_at : new Date(),
        ]);

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT DISTINCT ON (edges.origin_id, edges.destination_id, 
                            edges.data_source_id, edges.relationship_pair_id)
                        edges.*,
                        origin.uuid AS origin_metatype_uuid,
                        destination.uuid AS destination_metatype_uuid,
                        mpr.relationship_id,
                        metatype_relationships.name AS metatype_relationship_name,
                        metatype_relationships.uuid AS metatype_relationship_uuid,
                        mpr.uuid AS metatype_relationship_pair_uuid
                    FROM edges
                    INNER JOIN metatype_relationship_pairs mpr
                        ON edges.relationship_pair_id = mpr.id
                    LEFT JOIN metatype_relationships 
                        ON mpr.relationship_id = metatype_relationships.id
                    LEFT JOIN metatypes origin 
                        ON mpr.origin_metatype_id = origin.id
                    LEFT JOIN metatypes destination 
                        ON mpr.destination_metatype_id = destination.id
                    WHERE edges.deleted_at IS NULL
                    AND edges.id = $1
                    ORDER BY edges.origin_id, edges.destination_id, edges.data_source_id, 
                        edges.relationship_pair_id, edges.id, edges.created_at DESC`,
            values: [id],
        };
    }

    private retrieveHistoryStatement(edgeID: string): QueryConfig {
        return {
            text: `SELECT edges.*, metatype_relationships.name AS metatype_relationship_name
            FROM edges LEFT JOIN metatype_relationship_pairs ON edges.relationship_pair_id = metatype_relationship_pairs.id
            LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id
            WHERE edges.id = $1 ORDER BY edges.created_at ASC`,
            values: [edgeID],
        };
    }

    private retrieveRawDataHistoryStatement(edgeID: string): QueryConfig {
        return {
            text: `SELECT edges.*, metatype_relationships.name AS metatype_relationship_name, data_staging.data AS raw_data_properties
            FROM edges LEFT JOIN metatype_relationship_pairs ON edges.relationship_pair_id = metatype_relationship_pairs.id
            LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id
            LEFT JOIN data_staging ON edges.data_staging_id = data_staging.id
            WHERE edges.id = $1 ORDER BY edges.created_at ASC`,
            values: [edgeID],
        };
    }

    private retrieveByRelationshipStatement(origin: string, relationship: string, destination: string): QueryConfig {
        return {
            text: `SELECT DISTINCT ON (edges.origin_id, edges.destination_id, 
                            edges.data_source_id, edges.relationship_pair_id)
                        origin.name AS origin_metatype_name,
                        edges.*,
                        origin.uuid AS origin_metatype_uuid,
                        destination.uuid AS destination_metatype_uuid,
                        pairs.relationship_id,
                        relationships.name AS metatype_relationship_name,
                        relationships.uuid AS metatype_relationship_uuid,
                        pairs.uuid AS metatype_relationship_pair_uuid
                    FROM edges
                    INNER JOIN metatype_relationship_pairs pairs
                        ON edges.relationship_pair_id = pairs.id
                    LEFT JOIN metatype_relationships relationships
                        ON pairs.relationship_id = relationships.id
                    LEFT JOIN metatypes origin 
                        ON pairs.origin_metatype_id = origin.id
                    LEFT JOIN metatypes destination 
                        ON pairs.destination_metatype_id = destination.id
                    WHERE edges.deleted_at IS NULL
                        AND origin.name = $1
                        AND relationships.name = $2
                        AND destination.name = $3
                    ORDER BY edges.origin_id, edges.destination_id, edges.data_source_id, 
                        edges.relationship_pair_id, edges.id, edges.created_at DESC`,
            values: [origin, relationship, destination],
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
}
