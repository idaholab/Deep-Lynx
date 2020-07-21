CREATE TABLE IF NOT EXISTS data_type_mappings(
    id uuid PRIMARY KEY,
    container_id uuid REFERENCES containers(id) ON DELETE CASCADE,
    data_source_id uuid REFERENCES data_sources(id) ON DELETE CASCADE ,
    metatype_id uuid REFERENCES metatypes(id) ON DELETE CASCADE,
    metatype_relationship_id uuid REFERENCES metatype_relationships(id) ON DELETE CASCADE ,
    type_key text,
    action_key text,
    type_value text,
    unique_identifier_key text,
    origin_key text,
    destination_key text,
    keys jsonb,
    ignored_keys text[],
    example_payload jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);

ALTER TABLE IF EXISTS nodes
ADD COLUMN original_data_id text,
ADD COLUMN data_source_id uuid REFERENCES data_sources(id) ON DELETE SET NULL,
ADD COLUMN data_type_mapping_id uuid REFERENCES data_type_mappings(id) ON DELETE SET NULL;


ALTER TABLE IF EXISTS edges
DROP COLUMN relationship_pair_id;

ALTER TABLE IF EXISTS edges
ADD COLUMN original_data_id text,
ADD COLUMN relationship_id uuid REFERENCES metatype_relationships(id) ON DELETE SET NULL,
ADD COLUMN data_source_id uuid REFERENCES data_sources(id) ON DELETE SET NULL,
ADD COLUMN data_type_mapping_id uuid REFERENCES data_type_mappings(id) ON DELETE SET NULL;
