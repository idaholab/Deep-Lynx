DROP TABLE IF EXISTS data_type_mappings CASCADE;
DROP FUNCTION IF EXISTS set_type_mapping_trigger;

CREATE TYPE on_conflict_type AS ENUM ('create', 'update', 'ignore');

CREATE TABLE IF NOT EXISTS data_type_mappings (
    id uuid NOT NULL UNIQUE,
    container_id uuid REFERENCES containers(id) ON DELETE CASCADE,
    data_source_id uuid REFERENCES data_sources(id) ON DELETE CASCADE,
    active boolean NOT NULL DEFAULT false,
    shape_hash text NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sample_payload jsonb,
    UNIQUE(container_id, data_source_id, shape_hash)
);

CREATE TABLE IF NOT EXISTS data_type_mapping_transformations (
    id uuid NOT NULL UNIQUE,
    type_mapping_id uuid REFERENCES data_type_mappings(id) ON DELETE CASCADE,
    metatype_id uuid REFERENCES metatypes(id) ON DELETE CASCADE,
    metatype_relationship_pair_id uuid REFERENCES metatype_relationship_pairs(id) ON DELETE CASCADE,
    conditions jsonb,
    keys jsonb,
    origin_id_key text,
    destination_id_key text,
    unique_identifier_key text,
    on_conflict on_conflict_type,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
)
