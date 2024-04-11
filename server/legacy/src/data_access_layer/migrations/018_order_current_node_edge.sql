/*
The views were selecting distinct without ordering by created_at, causing a "random"
selection. Adding order by created_at
 */
DROP VIEW IF EXISTS current_nodes;
DROP VIEW IF EXISTS current_edges;

CREATE VIEW current_nodes AS (
    SELECT DISTINCT ON (id) nodes.id,
         nodes.container_id,
         nodes.metatype_id,
         nodes.data_source_id,
         nodes.import_data_id,
         nodes.data_staging_id,
         nodes.type_mapping_transformation_id,
         nodes.original_data_id,
         nodes.properties,
         nodes.metadata,
         nodes.created_at,
         nodes.modified_at,
         nodes.deleted_at,
         nodes.created_by,
         nodes.modified_by,
         metatypes.name AS metatype_name
    FROM nodes
        LEFT JOIN metatypes ON metatypes.id = nodes.metatype_id
    WHERE nodes.deleted_at IS NULL
    ORDER BY nodes.id, nodes.created_at DESC
);

CREATE VIEW current_edges AS (
    SELECT DISTINCT ON (id) edges.id,
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
        edges.destination_original_id,
        edges.destination_data_source_id,
        edges.destination_metatype_id,
        edges.properties,
        edges.metadata,
        edges.created_at,
        edges.modified_at,
        edges.deleted_at,
        edges.created_by,
        edges.modified_by,
        metatype_relationships.name AS metatype_relationship_name
    FROM edges
     LEFT JOIN metatype_relationship_pairs ON edges.relationship_pair_id = metatype_relationship_pairs.id
          LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id
    WHERE edges.deleted_at IS NULL
    ORDER BY edges.id, edges.created_at DESC
);