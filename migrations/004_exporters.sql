CREATE TABLE exports (
    id uuid PRIMARY KEY,
    container_id uuid REFERENCES containers(id),
    adapter text,
    status text,
    config jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);

CREATE TABLE gremlin_export_nodes (
   id uuid,
   gremlin_node_id text,
   export_id uuid NOT NULL REFERENCES exports(id) ON DELETE CASCADE,
   container_id uuid NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
   metatype_id uuid NOT NULL REFERENCES metatypes(id) ON DELETE CASCADE,
   properties jsonb NOT NULL
);

CREATE INDEX gremlinexportnodes_pkey ON gremlin_export_nodes(id uuid_ops);

CREATE TABLE gremlin_export_edges (
    id uuid,
    gremlin_edge_id text,
    export_id uuid NOT NULL REFERENCES exports(id) ON DELETE CASCADE,
    container_id uuid REFERENCES containers(id) ON DELETE CASCADE,
    relationship_pair_id uuid REFERENCES metatype_relationship_pairs(id) ON DELETE CASCADE,
    origin_node_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
    destination_node_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
    properties jsonb
);


CREATE INDEX gremlinexportedges_pkey ON gremlin_export_edges(id uuid_ops);