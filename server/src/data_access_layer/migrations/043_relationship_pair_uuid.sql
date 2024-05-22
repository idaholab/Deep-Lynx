DROP VIEW IF EXISTS current_edges;

CREATE VIEW current_edges AS
SELECT DISTINCT ON (edges.id) edges.id,
        edges.container_id,
        edges.relationship_pair_id,
        edges.data_source_id,
        edges.import_data_id,
        edges.data_staging_id,
        edges.type_mapping_transformation_id,
        edges.origin_id,
        edges.destination_id,
        edges.origin_original_id,
        edges.origin_data_source_id,
        edges.origin_metatype_id,
        origin.uuid AS origin_metatype_uuid,
        edges.destination_original_id,
        edges.destination_data_source_id,
        edges.destination_metatype_id,
        destination.uuid AS destination_metatype_uuid,
        edges.properties,
        edges.metadata,
        edges.created_at,
        edges.modified_at,
        edges.deleted_at,
        edges.created_by,
        edges.modified_by,
        metatype_relationship_pairs.relationship_id,
        metatype_relationships.name AS metatype_relationship_name,
        metatype_relationships.uuid AS metatype_relationship_uuid,
        metatype_relationship_pairs.uuid AS metatype_relationship_pair_uuid
        FROM ((edges
        LEFT JOIN metatype_relationship_pairs ON ((edges.relationship_pair_id = metatype_relationship_pairs.id)))
        LEFT JOIN metatype_relationships ON ((metatype_relationship_pairs.relationship_id = metatype_relationships.id))
        LEFT JOIN metatypes origin ON ((edges.origin_metatype_id = origin.id))
        LEFT JOIN metatypes destination ON ((edges.destination_metatype_id = destination.id)))
        WHERE (edges.deleted_at IS NULL)
        ORDER BY edges.id, edges.created_at DESC;