/*
We have a separate set of types that correspond to the general portions of the
GraphQL schema. We're doing this because the types we're sending in the query
response differ slightly from the node/edge type stored. We also displaying
the properties in a different manner than before.

Because of limitations in GraphQL and our auto-generating of resolvers/types
we can't send back a property in a simple object key:value. We must decompose
it into a Property type where everything is a string and we specify to the end
user what type it is.
 */
export type PropertyQL = {
    key: string
    value: string
    type: string
}

// We need to redefine the metatype type for consistency sake, when we return
// a type as part of a resolver that type should always be a QL type, not an internal
export type MetatypeQL = {
    id: string
    name: string
    description: string
}

export type MetatypeRelationshipQL = {
    id: string
    name: string
    description: string
}

export type NodeQL = {
    id: string
    container_id: string
    original_data_id: string
    data_source_id: string
    archived: boolean
    created_at: string
    modified_at: string
    metatype: Promise<MetatypeQL>
    properties: PropertyQL[]
    raw_properties: string
    incoming_edges: ({depth}:any) => Promise<EdgeQL[]>
    outgoing_edges: ({depth}:any) => Promise<EdgeQL[]>
}

export type EdgeQL = {
    id: string
    container_id: string
    original_data_id: string
    data_source_id: string
    archived: boolean
    created_at: string
    modified_at: string

    relationship: Promise<MetatypeRelationshipQL>
    origin: Promise<NodeQL>
    destination: Promise<NodeQL>
    properties: PropertyQL[]
    raw_properties: string
}
