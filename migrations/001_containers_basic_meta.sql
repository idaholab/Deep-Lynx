CREATE TABLE containers (
    name character varying(255) NOT NULL UNIQUE,
    description text NOT NULL DEFAULT ''::text,
    id uuid NOT NULL UNIQUE,
    archived boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);


CREATE UNIQUE INDEX id ON containers(id uuid_ops);
CREATE UNIQUE INDEX name ON containers(name text_ops);


CREATE TABLE metatypes (
    container_id uuid REFERENCES containers(id),
    id uuid PRIMARY KEY,
    name character varying(255) NOT NULL UNIQUE,
    description text NOT NULL DEFAULT '"::text'::text,
    archived boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);


CREATE UNIQUE INDEX metatype_id_pk ON metatypes(id uuid_ops);
CREATE UNIQUE INDEX metatype_name ON metatypes(name text_ops);

CREATE TABLE metatype_keys (
    metatype_id uuid NOT NULL REFERENCES metatypes(id) ON DELETE CASCADE,
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    required boolean NOT NULL,
    property_name character varying(255) NOT NULL,
    data_type character varying(255) NOT NULL,
    options text[],
    default_value text,
    archived boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL,
    CONSTRAINT metatype_key_id_name UNIQUE (metatype_id, name)
);

CREATE UNIQUE INDEX metatype_key_id_name_un ON metatype_keys(metatype_id uuid_ops,name text_ops);

CREATE TABLE metatype_relationships (
    container_id uuid REFERENCES containers(id) ON DELETE CASCADE,
    id uuid PRIMARY KEY,
    name character varying(255) NOT NULL,
    description text NOT NULL DEFAULT '"::text'::text,
    archived boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);


CREATE UNIQUE INDEX metatype_relationship_id_pk ON metatype_relationships(id uuid_ops);

CREATE TABLE metatype_relationship_keys (
    metatype_relationship_id uuid NOT NULL REFERENCES metatype_relationships(id) ON DELETE CASCADE,
    id uuid NOT NULL UNIQUE,
    name character varying(255) NOT NULL UNIQUE,
    description text NOT NULL,
    required boolean NOT NULL,
    property_name character varying(255) NOT NULL,
    data_type character varying(255) NOT NULL,
    options text[],
    default_value text,
    archived boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);


CREATE UNIQUE INDEX metatype_relationship_key_id ON metatype_relationship_keys(id uuid_ops);
CREATE UNIQUE INDEX metatype_relationship_key_name ON metatype_relationship_keys(name text_ops);

CREATE TABLE metatype_relationship_pairs (
    relationship_id uuid REFERENCES metatype_relationships(id) ON DELETE CASCADE,
    origin_metatype_id uuid REFERENCES metatypes(id) ON DELETE CASCADE,
    destination_metatype_id uuid REFERENCES metatypes(id) ON DELETE CASCADE,
    id uuid,
    name character varying(255),
    description text,
    relationship_type character varying(255),
    archived boolean NOT NULL DEFAULT false,
    container_id uuid REFERENCES containers(id),
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL,
    CONSTRAINT pair UNIQUE (relationship_id, origin_metatype_id, destination_metatype_id)
);

-- Indices -------------------------------------------------------

CREATE UNIQUE INDEX metatype_relationship_pair ON metatype_relationship_pairs(relationship_id uuid_ops,origin_metatype_id uuid_ops,destination_metatype_id uuid_ops);
CREATE UNIQUE INDEX metatype_relationship_pairs_pkey ON metatype_relationship_pairs(id uuid_ops);
