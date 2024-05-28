CREATE MATERIALIZED VIEW IF NOT EXISTS metatype_full_keys AS
WITH RECURSIVE parents AS (
    SELECT id, container_id, name, description, created_at,
        modified_at, created_by, modified_by, ontology_version,
        old_id, deleted_at, id AS key_parent, 1 AS lvl
    FROM metatypes_view
        UNION
    SELECT v.id, v.container_id, v.name, v.description, v.created_at,
        v.modified_at, v.created_by, v.modified_by, v.ontology_version,
        v.old_id, v.deleted_at, p.key_parent, p.lvl + 1
    FROM parents p JOIN metatypes_view v ON p.id = v.parent_id
) SELECT mk.id, p.id AS metatype_id, mk.name, mk.description,
    mk.required, mk.property_name, mk.data_type, mk.options,
    mk.default_value, mk.validation, mk.created_at, mk.modified_at,
    mk.created_by, mk.modified_by, mk.ontology_version,
    mk.container_id, mk.deleted_at
FROM parents p JOIN metatype_keys mk ON p.key_parent = mk.metatype_id
ORDER BY metatype_id, mk.name;

CREATE INDEX IF NOT EXISTS full_keys_metatype_id ON metatype_full_keys (metatype_id);
CREATE INDEX IF NOT EXISTS full_keys_container_id ON metatype_full_keys (container_id);
CREATE INDEX IF NOT EXISTS metatype_keys_metatype_id_index ON metatype_keys (metatype_id);
CREATE INDEX IF NOT EXISTS node_container_id_index ON nodes (container_id);
CREATE INDEX IF NOT EXISTS node_metatype_id_index ON nodes (metatype_id);
CREATE INDEX IF NOT EXISTS node_data_source_id_index ON nodes (data_source_id);
CREATE INDEX IF NOT EXISTS node_properties_index ON nodes USING gin(properties);
CREATE INDEX IF NOT EXISTS edge_container_id_index ON edges (container_id);
CREATE INDEX IF NOT EXISTS edge_relationship_pair_id_index ON edges (relationship_pair_id);
CREATE INDEX IF NOT EXISTS edge_origin_id_index ON edges (origin_id);
CREATE INDEX IF NOT EXISTS edge_destination_id_index ON edges (destination_id);