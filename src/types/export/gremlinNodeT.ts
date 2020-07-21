import * as t from 'io-ts'
import {recordMetaT} from "../recordMetaT";

export const gremlinNodeRequired = t.type({
    metatype_id: t.string,
    properties: t.unknown,
    id: t.string,
    export_id: t.string,
    gremlin_node_id: t.string,
    container_id: t.string,
});

export const gremlinNodeT = gremlinNodeRequired;
export const gremlinNodesT = t.array(gremlinNodeT);

export type GremlinNodesT = t.TypeOf<typeof gremlinNodesT>
export type GremlinNodeT = t.TypeOf<typeof gremlinNodeT>
