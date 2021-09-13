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
    key: string;
    value: string;
    type: string;
};

// We need to redefine the metatype type for consistency sake, when we return
// a type as part of a resolver that type should always be a QL type, not an internal
export type MetatypeQL = {
    id: string;
    name: string;
    description: string;
};

export type MetatypeRelationshipQL = {
    id: string;
    name: string;
    description: string;
};

export type NodeQL = {
    id: string;
    container_id: string;
    original_data_id: string;
    data_source_id: string;
    archived: boolean;
    created_at: string;
    modified_at: string;
    metatype: Promise<MetatypeQL>;
    properties: PropertyQL[];
    raw_properties: string;
    incoming_edges: ({ depth }: any) => Promise<EdgeQL[]>;
    outgoing_edges: ({ depth }: any) => Promise<EdgeQL[]>;
};

export type NodeWhereQL = {
    AND: NodeFilterQL[];
    OR: NodeFilterQL[];
};

export type NodeFilterQL = {
    id: string;
    container_id: string;
    original_data_id: string;
    data_source_id: string;
    archived: boolean;
    created_at: string;
    modified_at: string;
    metatype_name: string;
    metatype_id: string;
    properties: PropertyFilterQL[];
    import_data_id: string;
};

export type EdgeWhereQL = {
    AND: EdgeFilterQL[];
    OR: EdgeFilterQL[];
};

export type EdgeFilterQL = {
    container_id: string;
    original_data_id: string;
    data_source_id: string;
    archived: boolean;
    relationship_pair_id: string;
    relationship_name: string;
    origin_node_id: string;
    origin_node_original_id: string;
    destination_node_id: string;
    destination_node_original_id: string;
    properties: PropertyFilterQL[];
};

export type PropertyFilterQL = {
    key: string;
    operator: string;
    value: string;
};

export type EdgeQL = {
    id: string;
    container_id: string;
    original_data_id: string;
    data_source_id: string;
    archived: boolean;
    created_at: string;
    modified_at: string;

    relationship: Promise<MetatypeRelationshipQL>;
    origin_node: Promise<NodeQL>;
    destination_node: Promise<NodeQL>;
    properties: PropertyQL[];
    raw_properties: string;
};

export type FileQL = {
    id: string;
    file_name: string;
    file_size: number;
    created_at: string;
    modified_at: string;
    download_path: string;
    metadata: string;
};

export type FileWhereQL = {
    AND: FileFilterQL[];
    OR: FileFilterQL[];
};

export type FileFilterQL = {
    id: string;
    container_id: string;
    data_source_id: string;
    adapter: string;
    file_name: string;
};
