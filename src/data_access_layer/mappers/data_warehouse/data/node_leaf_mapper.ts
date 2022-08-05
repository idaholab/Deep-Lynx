import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Result from '../../../../common_classes/result';
import NodeLeaf, {nodeLeafQuery} from '../../../../domain_objects/data_warehouse/data/node_leaf';

/*
    NodeLeafMapper extends the Postgres database Mapper class and allows the
    NodeLeaf structure to be fetched from the database. Unlike other mapper
    structures in Deep Lynx, the NodeLeafMapper is used exclusively to fetch
    data instead of creating, updating, or deleting it, as its structure does
    not represent any one table in the database but a complex fetched result
    that combines data from several tables. The mapper's primary function is
    retrieving NodeLeaf objects.
*/

export default class NodeLeafMapper extends Mapper {
    public resultClass = NodeLeaf;
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
            resultClass: this.resultClass,
        });
    }

    // query-building function: returns a list of node-edge-node pairs (NodeLeafs)
    private retrieveNthNodesStatement(nodeID: string, container_id: string, depth: string): QueryConfig {
        return {
            text: nodeLeafQuery,
            values: [nodeID, container_id, depth],
        };
    }
}
