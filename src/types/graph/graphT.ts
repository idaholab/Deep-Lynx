import * as t from 'io-ts'
import {recordMetaT} from "../recordMetaT";

export const graphRequired = t.type({
    container_id: t.string,
    id: t.string
});

export const graphOptional = t.partial({
    archived: t.boolean
});

export const graphT = t.exact(t.intersection([graphRequired, graphOptional, recordMetaT]));
export const graphsT = t.array(graphT);

export type GraphsT = t.TypeOf<typeof graphsT>
export type GraphT = t.TypeOf<typeof graphT>

export const activeGraph = t.type({
    container_id: t.string,
    graph_id: t.string
});

export type ActiveGraphT = t.TypeOf<typeof activeGraph>
