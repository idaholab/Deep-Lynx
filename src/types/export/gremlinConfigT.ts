import * as t from 'io-ts'

const gremlinConfigTRequired = t.type({
    traversal_source: t.string,
    user: t.string,
    key: t.string,
    endpoint: t.string,
    port: t.string,
    path: t.string,
    writes_per_second:t.number
});

const gremlinConfigTOptional = t.partial({
    mime_type: t.string,
    graphson_v1: t.boolean
});

export const gremlinConfigT = t.intersection([gremlinConfigTRequired, gremlinConfigTOptional]);

export type GremlinConfigT = t.TypeOf<typeof gremlinConfigT>