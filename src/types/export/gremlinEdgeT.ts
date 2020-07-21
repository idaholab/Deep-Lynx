import * as t from 'io-ts'
import {recordMetaT} from "../recordMetaT";

export const gremlinEdgeRequired = t.type({
    relationship_pair_id: t.string,
    properties: t.unknown,
    origin_node_id: t.string,
    destination_node_id: t.string,
    id: t.string,
    gremlin_edge_id: t.string,
    export_id:t.string,
    container_id: t.string,
});

export const gremlinEdgeT = gremlinEdgeRequired;
export const gremlinEdgesT = t.array(gremlinEdgeT);

export type GremlinEdgesT = t.TypeOf<typeof gremlinEdgesT>
export type GremlinEdgeT = t.TypeOf<typeof gremlinEdgeT>
