DROP VIEW IF EXISTS current_nodes;

CREATE VIEW current_nodes AS(
    SELECT DISTINCT ON (nodes.original_data_id, nodes.data_source_id, nodes.metatype_id)
        nodes.id,
        nodes.container_id,
        nodes.metatype_id,
        nodes.data_source_id,
        nodes.import_data_id,
        nodes.data_staging_id,
        nodes.type_mapping_transformation_id,
        nodes.original_data_id,
        nodes.properties,
        nodes.metadata_properties,
        nodes.metadata,
        nodes.created_at,
        nodes.modified_at,
        nodes.deleted_at,
        nodes.created_by,
        nodes.modified_by,
        metatypes.name AS metatype_name,
        metatypes.uuid AS metatype_uuid
    FROM (nodes
        LEFT JOIN metatypes ON ((metatypes.id = nodes.metatype_id)))
    WHERE (nodes.deleted_at IS NULL)
    ORDER BY nodes.original_data_id, nodes.data_source_id, nodes.metatype_id, nodes.created_at DESC);