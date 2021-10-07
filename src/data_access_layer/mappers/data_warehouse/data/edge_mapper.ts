import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Result from '../../../../common_classes/result';
import Edge from '../../../../domain_objects/data_warehouse/data/edge';
import uuid from 'uuid';

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
    public async CreateOrUpdateByCompositeID(userID: string, edge: Edge, transaction?: PoolClient): Promise<Result<Edge>> {
        const r = await super.run(this.createOrUpdateStatement(userID, edge), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public BulkCreateOrUpdateByCompositeID(userID: string, edges: Edge[], transaction?: PoolClient): Promise<Result<Edge[]>> {
        return super.run(this.createOrUpdateStatement(userID, ...edges), {
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

    public async UpdateByCompositeOriginalID(userID: string, edge: Edge, transaction?: PoolClient): Promise<Result<Edge>> {
        const r = await super.run(this.updateByCompositeOriginalIDStatement(userID, edge), {transaction, resultClass});
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

    public RetrieveByCompositeID(compositeID: string, dataSourceID: string, transaction?: PoolClient): Promise<Result<Edge>> {
        return super.retrieve<Edge>(this.retrieveByCompositeIDStatement(compositeID, dataSourceID), {transaction, resultClass});
    }

    public AddFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.addFile(id, fileID));
    }

    public RemoveFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.removeFile(id, fileID));
    }

    public Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    public Archive(userID: string, id: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(userID, id));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createOrUpdateStatement(userID: string, ...edges: Edge[]): string {
        const text = `INSERT INTO edges(
            id,
            container_id,
            relationship_pair_id,
            graph_id, origin_node_id,
            destination_node_id,
            properties,
            original_data_id,
            data_source_id,
            type_mapping_transformation_id,
            origin_node_original_id,
            destination_node_original_id,
            import_data_id,
            data_staging_id,
            composite_original_id,
            origin_node_composite_original_id,
            destination_node_composite_original_id,
            metadata,
            created_by,
            modified_by) VALUES %L
                      ON CONFLICT (composite_original_id, data_source_id)
                          DO
        UPDATE SET
            container_id = excluded.container_id,
            relationship_pair_id = excluded.relationship_pair_id,
            graph_id = excluded.graph_id,
            origin_node_id = excluded.origin_node_id,
            destination_node_id = excluded.destination_node_id,
            properties = excluded.properties,
            original_data_id = excluded.original_data_id,
            data_source_id = excluded.data_source_id,
            type_mapping_transformation_id = excluded.type_mapping_transformation_id,
            origin_node_original_id = excluded.origin_node_original_id,
            destination_node_original_id = excluded.destination_node_original_id,
            import_data_id = excluded.import_data_id,
            data_staging_id = excluded.data_staging_id,
            composite_original_id = excluded.composite_original_id,
            origin_node_composite_original_id = excluded.origin_node_composite_original_id,
            destination_node_composite_original_id = excluded.destination_node_composite_original_id,
            modified_by = excluded.modified_by,
            metadata = excluded.metadata,
            modified_at = NOW()
            RETURNING *`;

        const values = edges.map((e) => [
            uuid.v4(),
            e.container_id,
            e.relationship_pair_id,
            e.graph_id,
            e.origin_node_id,
            e.destination_node_id,
            JSON.stringify(e.properties),
            e.original_data_id,
            e.data_source_id,
            e.type_mapping_transformation_id,
            e.origin_node_original_id,
            e.destination_node_original_id,
            e.import_data_id,
            e.data_staging_id,
            e.composite_original_id,
            e.origin_node_composite_original_id,
            e.destination_node_original_id,
            JSON.stringify(e.metadata),
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...edges: Edge[]): string {
        const text = `UPDATE edges as e SET
            container_id = u.container_id::uuid,
                            relationship_pair_id = u.relationship_pair_id::uuid,
                            graph_id = u.graph_id::uuid,
                            origin_node_id = u.origin_node_id::uuid,
                            destination_node_id = u.destination_node_id::uuid,
                            properties = u.properties::jsonb,
                            original_data_id = u.original_data_id,
                            data_source_id = u.data_source_id::uuid,
                            type_mapping_transformation_id = u.type_mapping_transformation_id::uuid,
                            origin_node_original_id = u.origin_node_original_id,
                            destination_node_original_id = u.destination_node_original_id,
                            import_data_id = u.import_data_id::uuid,
                            data_staging_id = u.data_staging_id::int4,
                            composite_original_id = u.composite_original_id,
                            origin_node_composite_original_id = u.origin_node_composite_original_id,
                            destination_node_composite_original_id = u.destination_node_composite_original_id,
                            metadata = u.metadata::jsonb,
                            modified_by = u.modified_by,
                            modified_at = NOW()
                      FROM(VALUES %L) as u(
                          id,
                          container_id,
                          relationship_pair_id,
                          graph_id, origin_node_id,
                          destination_node_id,
                          properties,
                          original_data_id,
                          data_source_id,
                          type_mapping_transformation_id,
                          origin_node_original_id,
                          destination_node_original_id,
                          import_data_id,
                          data_staging_id,
                          composite_original_id,
                          origin_node_composite_original_id,
                          destination_node_composite_original_id,
                          metadata,
                          modified_by)
                      WHERE u.id::uuid = e.id RETURNING e.*`;

        const values = edges.map((e) => [
            e.id,
            e.container_id,
            e.relationship_pair_id,
            e.graph_id,
            e.origin_node_id,
            e.destination_node_id,
            JSON.stringify(e.properties),
            e.original_data_id,
            e.data_source_id,
            e.type_mapping_transformation_id,
            e.origin_node_original_id,
            e.destination_node_original_id,
            e.import_data_id,
            e.data_staging_id,
            e.composite_original_id,
            e.origin_node_composite_original_id,
            e.destination_node_original_id,
            JSON.stringify(e.metadata),
            userID,
        ]);

        return format(text, values);
    }

    private updateByCompositeOriginalIDStatement(userID: string, ...edges: Edge[]): string {
        const text = `UPDATE edges as e SET
            container_id = u.container_id::uuid,
                            relationship_pair_id = u.relationahip_pair_id::uuid,
                            graph_id = u.graph_id:uuid,
                            origin_node_id = u.origin_node_id::uuid,
                            destination_node_id = u.destination_node_id::uuid,
                            properties = u.properties::jsonb,
                            original_data_id = u.original_data_id,
                            data_source_id = u.data_source_id::uuid,
                            type_mapping_transformation_id = u.type_mapping_transformation_id::uuid,
                            origin_node_original_id = u.origin_node_original_id,
                            destination_node_original_id = u.destination_node_original_id,
                            import_data_id = u.import_data_id::uuid,
                            data_staging_id = u.data_staging_id::int4,
                            composite_original_id = u.composite_original_id,
                            origin_node_composite_original_id = u.origin_node_composite_original_id,
                            destination_node_composite_original_id = u.destination_node_composite_original_id,
                            metadata = u.metadata::jsonb,
                            modified_by = u.modified_by,
                            modified_at = NOW()
                      FROM(VALUES %L) as u(
                          container_id,
                          relationship_pair_id,
                          graph_id, origin_node_id,
                          destination_node_id,
                          properties,
                          original_data_id,
                          data_source_id,
                          type_mapping_transformation_id,
                          origin_node_original_id,
                          destination_node_original_id,
                          import_data_id,
                          data_staging_id,
                          composite_original_id,
                          origin_node_composite_original_id,
                          destination_node_composite_original_id,
                          metadata,
                          modified_by)
                      WHERE u.composite_original_id = e.composite_original_id RETURNING *`;

        const values = edges.map((e) => [
            e.container_id,
            e.relationship_pair_id,
            e.graph_id,
            e.origin_node_id,
            e.destination_node_id,
            JSON.stringify(e.properties),
            e.original_data_id,
            e.data_source_id,
            e.type_mapping_transformation_id,
            e.origin_node_original_id,
            e.destination_node_original_id,
            e.import_data_id,
            e.data_staging_id,
            e.composite_original_id,
            e.origin_node_composite_original_id,
            e.destination_node_original_id,
            JSON.stringify(e.metadata),
            userID,
        ]);

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE id = $1 AND NOT archived`,
            values: [id],
        };
    }

    private retrieveByCompositeIDStatement(compositeID: string, dataSourceID: string): QueryConfig {
        return {
            text: `SELECT * FROM edges WHERE composite_original_id = $1 AND data_source_id = $2 AND NOT archived`,
            values: [compositeID, dataSourceID],
        };
    }

    private archiveStatement(userID: string, edgeID: string): QueryConfig {
        return {
            text: `UPDATE edges SET archived = true, modified_by = $1, modified_at = NOW()  WHERE id = $2`,
            values: [userID, edgeID],
        };
    }

    private deleteStatement(edgeID: string): QueryConfig {
        return {
            text: `DELETE FROM edges WHERE id = $1`,
            values: [edgeID],
        };
    }

    private addFile(edgeID: string, fileID: string): QueryConfig {
        return {
            text: `INSERT INTO edge_files(edge_id, file_id) VALUES ($1, $2)`,
            values: [edgeID, fileID],
        };
    }

    private removeFile(edgeID: string, fileID: string): QueryConfig {
        return {
            text: `DELETE FROM edge_files WHERE edge_id = $1 AND file_id = $2`,
            values: [edgeID, fileID],
        };
    }
}
