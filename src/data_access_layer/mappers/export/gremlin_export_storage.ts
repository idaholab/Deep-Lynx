import Result from "../../../result"
import PostgresStorage from "../postgresStorage";
import {PoolClient, QueryConfig} from "pg";
import {GremlinNodeT} from "../../../types/export/gremlinNodeT";
import {GremlinEdgeT} from "../../../types/export/gremlinEdgeT";

/*
* GremlinExportStorage contains all storage operations for the gremlin_export_nodes
* and gremlin_export_edges tables.
*/
export default class GremlinExportStorage extends PostgresStorage{

    private static instance: GremlinExportStorage;

    public static get Instance(): GremlinExportStorage {
        if(!GremlinExportStorage.instance) {
            GremlinExportStorage.instance = new GremlinExportStorage()
        }

        return GremlinExportStorage.instance
    }

    public InitiateExport(exportID: string, containerID: string): Promise<Result<boolean>>{
        return super.runAsTransaction(...GremlinExportStorage.initiateExportStatement(exportID, containerID))
    }

    public DeleteForExport(exportID: string): Promise<Result<boolean>>{
        return super.runAsTransaction(...GremlinExportStorage.deleteAllForExport(exportID))
    }

    public SetGremlinNodeID(nodeID: string, gremlinNodeID: string): Promise<Result<boolean>> {
        return super.run(GremlinExportStorage.setGremlinNodeIDStatement(nodeID, gremlinNodeID))
    }

    public SetGremlinEdgeID(edgeID: string, gremlinEdgeID: string): Promise<Result<boolean>> {
        return super.run(GremlinExportStorage.setGremlinEdgeIDStatement(edgeID, gremlinEdgeID))
    }

    public RetrieveNode(id: string): Promise<Result<GremlinNodeT>> {
        return super.retrieve<GremlinNodeT>(GremlinExportStorage.retrieveNodeStatement(id))
    }

    public RetrieveEdge(id: string): Promise<Result<GremlinEdgeT>> {
        return super.retrieve<GremlinEdgeT>(GremlinExportStorage.retrieveEdgeStatement(id))
    }

    public ListUnassociatedNodesAndLock(exportID: string, offset: number, limit: number, client: PoolClient, wait?: boolean): Promise<Result<GremlinNodeT[]>> {
        return super.rows<GremlinNodeT>(GremlinExportStorage.listUnassociatedAndLockNodesStatement(exportID, offset, limit, wait), client)
    }

    public ListAssociatedNodes(exportID: string, offset: number, limit: number ): Promise<Result<GremlinNodeT[]>> {
        return super.rows<GremlinNodeT>(GremlinExportStorage.listAssociatedNodesStatement(exportID, offset, limit))
    }

    public ListUnassociatedEdgesAndLock(exportID: string, offset: number, limit: number, client: PoolClient, wait?: boolean ): Promise<Result<GremlinEdgeT[]>> {
        return super.rows<GremlinEdgeT>(GremlinExportStorage.listUnassociatedAndLockEdgesStatement(exportID, offset, limit, wait), client)
    }

    public ListAssociatedEdges(exportID: string, offset: number, limit: number ): Promise<Result<GremlinEdgeT[]>> {
        return super.rows<GremlinEdgeT>(GremlinExportStorage.listAssociatedEdgesStatement(exportID, offset, limit))
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(GremlinExportStorage.deleteStatement(id))
    }

    // this set of statements copies all current nodes and edges to the gremlin_* tables
    // and attaches the proper export ID
    private static initiateExportStatement(exportID: string, containerID: string): QueryConfig[] {
        return [
            {
                text: `INSERT INTO gremlin_export_nodes(id, export_id, container_id, metatype_id,  properties)
                       SELECT id, '${exportID}' as export_id, container_id, metatype_id, properties
                       FROM nodes
                       WHERE nodes.archived = FALSE
                       AND nodes.container_id = $1`,
                values: [containerID]
            },
            {
                text: `INSERT INTO gremlin_export_edges(id, export_id, container_id, relationship_pair_id, origin_node_id, destination_node_id, properties)
                       SELECT id, '${exportID}' as export_id, container_id, relationship_pair_id, origin_node_id, destination_node_id, properties
                       FROM edges
                       WHERE edges.archived = FALSE
                       AND edges.container_id = $1`,
                values: [containerID]
            },
        ]
    }

    private static deleteAllForExport(exportID: string): QueryConfig[]{
        return[
            {
                text: `DELETE FROM gremlin_export_nodes WHERE export_id = $1`,
                values:[exportID]
            },
            {
                text: `DELETE FROM gremlin_export_edges WHERE export_id = $1`,
                values: [exportID]
            }
        ]
    }

    private static deleteStatement(exportID: string): QueryConfig {
        return {
            text:`DELETE FROM exports WHERE id = $1`,
            values: [exportID]
        }
    }

    private static setGremlinNodeIDStatement(nodeID: string, gremlinNodeID: string): QueryConfig {
        return {
            text:`UPDATE gremlin_export_nodes SET gremlin_node_id = $1 WHERE id = $2`,
            values: [gremlinNodeID, nodeID]
        }
    }

    private static setGremlinEdgeIDStatement(edgeID: string, gremlinEdgeID: string): QueryConfig {
        return {
            text:`UPDATE gremlin_export_edges SET gremlin_edge_id = $1 WHERE id = $2`,
            values: [gremlinEdgeID, edgeID]
        }
    }

    private static retrieveEdgeStatement(id:string): QueryConfig {
        return {
            text:`SELECT * FROM gremlin_export_edges WHERE id = $1`,
            values: [id]
        }
    }

    private static retrieveNodeStatement(id:string): QueryConfig {
        return {
            text:`SELECT * FROM gremlin_export_nodes WHERE id = $1`,
            values: [id]
        }
    }

    private static listUnassociatedAndLockNodesStatement(exportID: string, offset: number, limit: number, wait?: boolean): QueryConfig {
        if(wait) {
            return {
                text: `SELECT * FROM gremlin_export_nodes WHERE export_id = $1 AND gremlin_node_id IS NULL OFFSET $2 LIMIT $3 FOR UPDATE`,
                values: [exportID, offset, limit]
            }
        }

        return {
            text: `SELECT * FROM gremlin_export_nodes WHERE export_id = $1 AND gremlin_node_id IS NULL OFFSET $2 LIMIT $3 FOR UPDATE NOWAIT`,
            values: [exportID, offset, limit]
        }
    }

    private static listAssociatedNodesStatement(exportID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT * FROM gremlin_export_nodes WHERE export_id = $1 AND gremlin_node_id NOT NULL OFFSET $2 LIMIT $3`,
            values: [exportID, offset, limit]
        }
    }

    private static listUnassociatedAndLockEdgesStatement(exportID: string, offset: number, limit: number, wait?: boolean): QueryConfig {
        if(wait) {
            return {
                text: `SELECT * FROM gremlin_export_edges WHERE export_id = $1 AND gremlin_edge_id IS NULL OFFSET $2 LIMIT $3 FOR UPDATE`,
                values: [exportID, offset, limit]
            }
        }
        return {
            text: `SELECT * FROM gremlin_export_edges WHERE export_id = $1 AND gremlin_edge_id IS NULL OFFSET $2 LIMIT $3 FOR UPDATE NOWAIT`,
            values: [exportID, offset, limit]
        }
    }

    private static listAssociatedEdgesStatement(exportID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT * FROM gremlin_export_edges WHERE export_id = $1 AND gremlin_edge_id NOT NULL OFFSET $2 LIMIT $3`,
            values: [exportID, offset, limit]
        }
    }
}
