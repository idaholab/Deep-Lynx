import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import {GremlinEdge, GremlinNode} from '../../../../interfaces_and_impl/data_warehouse/export/gremlin_export_impl';

/*
    GremlinExportMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well. In this particular mapper we actually communicate
    to two individual tables, basically copies of the existing container's data
    so that we can insert to Gremlin enabled graph databases at our leisure.
*/
export default class GremlinExportMapper extends Mapper {
    private static instance: GremlinExportMapper;

    public static get Instance(): GremlinExportMapper {
        if (!GremlinExportMapper.instance) {
            GremlinExportMapper.instance = new GremlinExportMapper();
        }

        return GremlinExportMapper.instance;
    }

    public InitiateExport(exportID: string, containerID: string): Promise<Result<boolean>> {
        return super.runAsTransaction(...this.initiateExportStatement(exportID, containerID));
    }

    public DeleteForExport(exportID: string): Promise<Result<boolean>> {
        return super.runAsTransaction(...this.deleteAllForExport(exportID));
    }

    public SetGremlinNodeID(nodeID: string, gremlinNodeID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setGremlinNodeIDStatement(nodeID, gremlinNodeID));
    }

    public SetGremlinEdgeID(edgeID: string, gremlinEdgeID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setGremlinEdgeIDStatement(edgeID, gremlinEdgeID));
    }

    public RetrieveNode(id: string): Promise<Result<GremlinNode>> {
        return super.retrieve(this.retrieveNodeStatement(id), {
            resultClass: GremlinNode,
        });
    }

    public RetrieveEdge(id: string): Promise<Result<GremlinEdge>> {
        return super.retrieve(this.retrieveEdgeStatement(id), {
            resultClass: GremlinEdge,
        });
    }

    public ListUnassociatedNodesAndLock(
        exportID: string,
        offset: number,
        limit: number,
        transaction?: PoolClient,
        wait?: boolean,
    ): Promise<Result<GremlinNode[]>> {
        return super.rows(this.listUnassociatedAndLockNodesStatement(exportID, offset, limit, wait), {transaction, resultClass: GremlinNode});
    }

    public ListAssociatedNodes(exportID: string, offset: number, limit: number): Promise<Result<GremlinNode[]>> {
        return super.rows(this.listAssociatedNodesStatement(exportID, offset, limit), {resultClass: GremlinNode});
    }

    public ListUnassociatedEdgesAndLock(
        exportID: string,
        offset: number,
        limit: number,
        transaction?: PoolClient,
        wait?: boolean,
    ): Promise<Result<GremlinEdge[]>> {
        return super.rows(this.listUnassociatedAndLockEdgesStatement(exportID, offset, limit, wait), {transaction, resultClass: GremlinEdge});
    }

    public ListAssociatedEdges(exportID: string, offset: number, limit: number): Promise<Result<GremlinEdge[]>> {
        return super.rows(this.listAssociatedEdgesStatement(exportID, offset, limit), {resultClass: GremlinEdge});
    }

    public Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    // this set of statements copies all current nodes and edges to the gremlin_* tables
    // and attaches the proper export ID
    private initiateExportStatement(exportID: string, containerID: string): QueryConfig[] {
        return [
            {
                text: `INSERT INTO gremlin_export_nodes(id, export_id, container_id, metatype_id,  properties)
                       SELECT id, '${exportID}' as export_id, container_id, metatype_id, properties
                       FROM nodes
                       WHERE nodes.deleted_at IS NULL
                       AND nodes.container_id = $1`,
                values: [containerID],
            },
            {
                text: `INSERT INTO gremlin_export_edges(id, export_id, container_id, relationship_pair_id, origin_id, destination_id, properties)
                       SELECT id, '${exportID}' as export_id, container_id, relationship_pair_id, origin_id, destination_id, properties
                       FROM edges
                       WHERE edges.deleted_at IS NULL
                       AND edges.container_id = $1`,
                values: [containerID],
            },
        ];
    }

    private deleteAllForExport(exportID: string): QueryConfig[] {
        return [
            {
                text: `DELETE FROM gremlin_export_nodes WHERE export_id = $1`,
                values: [exportID],
            },
            {
                text: `DELETE FROM gremlin_export_edges WHERE export_id = $1`,
                values: [exportID],
            },
        ];
    }

    private deleteStatement(exportID: string): QueryConfig {
        return {
            text: `DELETE FROM exports WHERE id = $1`,
            values: [exportID],
        };
    }

    private setGremlinNodeIDStatement(nodeID: string, gremlinNodeID: string): QueryConfig {
        return {
            text: `UPDATE gremlin_export_nodes SET gremlin_node_id = $1 WHERE id = $2`,
            values: [gremlinNodeID, nodeID],
        };
    }

    private setGremlinEdgeIDStatement(edgeID: string, gremlinEdgeID: string): QueryConfig {
        return {
            text: `UPDATE gremlin_export_edges SET gremlin_edge_id = $1 WHERE id = $2`,
            values: [gremlinEdgeID, edgeID],
        };
    }

    private retrieveEdgeStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM gremlin_export_edges WHERE id = $1`,
            values: [id],
        };
    }

    private retrieveNodeStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM gremlin_export_nodes WHERE id = $1`,
            values: [id],
        };
    }

    private listUnassociatedAndLockNodesStatement(exportID: string, offset: number, limit: number, wait?: boolean): QueryConfig {
        if (wait) {
            return {
                text: `SELECT * FROM gremlin_export_nodes WHERE export_id = $1 AND gremlin_node_id IS NULL OFFSET $2 LIMIT $3 FOR UPDATE`,
                values: [exportID, offset, limit],
            };
        }

        return {
            text: `SELECT * FROM gremlin_export_nodes WHERE export_id = $1 AND gremlin_node_id IS NULL OFFSET $2 LIMIT $3 FOR UPDATE NOWAIT`,
            values: [exportID, offset, limit],
        };
    }

    private listAssociatedNodesStatement(exportID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT * FROM gremlin_export_nodes WHERE export_id = $1 AND gremlin_node_id IS NOT NULL OFFSET $2 LIMIT $3`,
            values: [exportID, offset, limit],
        };
    }

    private listUnassociatedAndLockEdgesStatement(exportID: string, offset: number, limit: number, wait?: boolean): QueryConfig {
        if (wait) {
            return {
                text: `SELECT * FROM gremlin_export_edges WHERE export_id = $1 AND gremlin_edge_id IS NULL OFFSET $2 LIMIT $3 FOR UPDATE`,
                values: [exportID, offset, limit],
            };
        }
        return {
            text: `SELECT * FROM gremlin_export_edges WHERE export_id = $1 AND gremlin_edge_id IS NULL OFFSET $2 LIMIT $3 FOR UPDATE NOWAIT`,
            values: [exportID, offset, limit],
        };
    }

    private listAssociatedEdgesStatement(exportID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT * FROM gremlin_export_edges WHERE export_id = $1 AND gremlin_edge_id IS NOT NULL OFFSET $2 LIMIT $3`,
            values: [exportID, offset, limit],
        };
    }
}
