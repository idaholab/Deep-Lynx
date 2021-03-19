import Result from "../../../../result"
import Mapper from "../../mapper";
import {PoolClient, QueryConfig} from "pg";
import Node from "../../../../data_warehouse/data/node"
import uuid from "uuid";

const format = require('pg-format')
const resultClass = Node

/*
* NodeStorage encompasses all logic dealing with the manipulation of the data nodes
* class in a data storage layer.
*/
export default class NodeMapper extends Mapper{
    public static tableName = "nodes";

    private static instance: NodeMapper;

    public static get Instance(): NodeMapper {
        if(!NodeMapper.instance) {
            NodeMapper.instance = new NodeMapper()
        }

        return NodeMapper.instance
    }

    public async CreateOrUpdateByCompositeID(userID: string, node: Node, transaction?: PoolClient): Promise<Result<Node>> {
        const r = await super.run(this.createOrUpdateStatement(userID, node), {transaction, resultClass})
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public BulkCreateOrUpdateByCompositeID(userID: string, nodes: Node[], transaction?: PoolClient): Promise<Result<Node[]>> {
        return super.run(this.createOrUpdateStatement(userID, ...nodes), {transaction, resultClass})
    }

    public async Update(userID: string, node: Node, transaction?: PoolClient): Promise<Result<Node>> {
        const r = await super.run(this.fullUpdateStatement(userID, node), {transaction, resultClass})
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public BulkUpdate(userID: string, nodes: Node[], transaction?: PoolClient): Promise<Result<Node[]>> {
        return super.run(this.fullUpdateStatement(userID, ...nodes), {transaction, resultClass})
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id))
    }

    public Archive(userID: string, id: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(userID, id))
    }

    public async Retrieve(id: string, transaction?:PoolClient): Promise<Result<Node>> {
        return super.retrieve(this.retrieveStatement(id), {transaction, resultClass})
    }

    public async RetrieveByCompositeOriginalID(originalID: string, dataSourceID: string, transaction?:PoolClient): Promise<Result<Node>> {
        return super.retrieve(this.retrieveByCompositeOriginalIDStatement(dataSourceID, originalID), {transaction, resultClass})
    }

    public async DomainRetrieve(id: string, containerID: string, transaction?: PoolClient): Promise<Result<Node>> {
       return super.retrieve(this.domainRetrieveStatement(id, containerID), {transaction, resultClass})
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createOrUpdateStatement(userID: string, ...nodes: Node[]): string {
            const text = `INSERT INTO nodes(
                  id,
                  container_id,
                  metatype_id,
                  graph_id,
                  properties,
                  original_data_id,
                  data_source_id,
                  type_mapping_transformation_id,
                  import_data_id,
                  data_staging_id,
                  composite_original_id,
                  created_by,
                  modified_by) VALUES %L
            ON CONFLICT (composite_original_id, data_source_id)
            DO
            UPDATE SET
                container_id = excluded.container_id,
                metatype_id = excluded.metatype_id,
                graph_id = excluded.graph_id,
                properties = excluded.properties,
                original_data_id = excluded.original_data_id,
                data_source_id = excluded.data_source_id,
                type_mapping_transformation_id = excluded.type_mapping_transformation_id,
                import_data_id = excluded.import_data_id,
                data_staging_id = excluded.data_staging_id,
                composite_original_id = excluded.composite_original_id,
                modified_by = excluded.modified_by,
                modified_at = NOW()
            RETURNING *`

            const values = nodes.map(n => [
                uuid.v4(),
                n.container_id,
                n.metatype!.id,
                n.graph_id,
                JSON.stringify(n.properties),
                n.original_data_id,
                n.data_source_id,
                n.type_mapping_transformation_id,
                n.import_data_id,
                n.data_staging_id,
                n.composite_original_id,
                userID, userID])

            return format(text, values)
    }

    private fullUpdateStatement(userID: string, ...nodes: Node[]): string {
        const text = `UPDATE nodes AS n SET
                container_id = u.container_id::uuid,
                metatype_id = u.metatype_id::uuid,
                graph_id = u.graph_id::uuid,
                properties = u.properties::jsonb,
                original_data_id = u.original_data_id,
                data_source_id = u.data_source_id::uuid,
                type_mapping_transformation_id = u.type_mapping_transformation_id::uuid,
                import_data_id = u.import_data_id::uuid,
                data_staging_id = u.data_staging_id::int4,
                composite_original_id = u.composite_original_id,
                modified_by = u.modified_by,
                modified_at = NOW()
                FROM(VALUES %L) AS u(
                        id,
                        container_id,
                        metatype_id,
                        graph_id,
                        properties,
                        original_data_id,
                        data_source_id,
                        type_mapping_transformation_id,
                        import_data_id,
                        data_staging_id,
                        composite_original_id,
                        modified_by)
                WHERE u.id::uuid = n.id RETURNING n.*`

        const values = nodes.map(n => [
            n.id,
            n.container_id,
            n.metatype!.id,
            n.graph_id,
            JSON.stringify(n.properties),
            n.original_data_id,
            n.data_source_id,
            n.type_mapping_transformation_id,
            n.import_data_id,
            n.data_staging_id,
            n.composite_original_id,
            userID, userID])

        return format(text, values)
    }

    private retrieveStatement(nodeID: string): QueryConfig {
        return {
            text: `SELECT * FROM nodes WHERE id = $1 AND NOT archived`,
            values: [nodeID]
        }
    }

    private domainRetrieveStatement(nodeID: string, containerID:string): QueryConfig {
        return {
            text: `SELECT * FROM nodes WHERE id = $1 AND container_id = $2 AND NOT archived`,
            values: [nodeID, containerID]
        }
    }

    // because the data source and data are so tightly intertwined, you must include both in order to pull a single
    // piece of data by original id
    private retrieveByCompositeOriginalIDStatement(dataSourceID:string, originalID: string): QueryConfig {
        return {
            text: `SELECT * FROM nodes WHERE composite_original_id = $1 AND data_source_id = $2 AND NOT archived`,
            values: [originalID, dataSourceID]
        }
    }

    private archiveStatement(userID:string, nodeID: string): QueryConfig {
        return {
            text:`UPDATE nodes SET archived = true, modified_by = $2, modified_at = NOW()  WHERE id = $1`,
            values: [nodeID, userID]
        }
    }

    private deleteStatement(nodeID: string): QueryConfig {
        return {
            text:`DELETE FROM nodes WHERE id = $1`,
            values: [nodeID]
        }
    }

    private listStatement(containerID: string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM nodes WHERE container_id = $1 AND NOT archived OFFSET $2 LIMIT $3`,
            values: [containerID, offset, limit]
        }
    }
}
