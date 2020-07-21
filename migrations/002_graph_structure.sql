CREATE TABLE graphs (
    container_id uuid REFERENCES containers(id) ON DELETE SET NULL,
    id uuid PRIMARY KEY,
    archived boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);

/*
active_graphs contains data on the currently attached graph for a container
there can only ever by one active graph/container combination even though there
can be multiple graphs that belong to a container
 */
CREATE TABLE active_graphs (
    graph_id uuid REFERENCES graphs(id) ON DELETE CASCADE ,
    container_id uuid REFERENCES containers(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);

CREATE TABLE nodes (
   id uuid PRIMARY KEY,
   container_id uuid NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
   metatype_id uuid NOT NULL REFERENCES metatypes(id) ON DELETE CASCADE,
   metatype_name text NOT NULL,
   graph_id uuid NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
   properties jsonb NOT NULL,
   archived boolean NOT NULL DEFAULT false,
   created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
   modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
   created_by character varying(257) NOT NULL,
   modified_by character varying(257) NOT NULL
);

CREATE TABLE edges (
    id uuid PRIMARY KEY,
    container_id uuid REFERENCES containers(id) ON DELETE CASCADE,
    relationship_pair_id uuid REFERENCES metatype_relationship_pairs(id) ON DELETE CASCADE,
    graph_id uuid REFERENCES graphs(id) ON DELETE CASCADE,
    origin_node_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
    destination_node_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
    properties jsonb,
    archived boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(257) NOT NULL,
    modified_by character varying(257) NOT NULL
);


