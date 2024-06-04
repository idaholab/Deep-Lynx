/* we must replace parts of the node_insert_trigger's underlying function, so drop it */
DROP TRIGGER IF EXISTS node_insert_trigger ON default_node_partition;

/* we no longer need the edge trigger at all */
DROP TRIGGER IF EXISTS edge_insert_trigger ON default_edge_partition;

/*
we've modified the node insert trigger to not automatically set the
deleted_at any longer - this was causing massive slow downs
 */
CREATE OR REPLACE FUNCTION node_insert_trigger() RETURNS TRIGGER AS $$
DECLARE
    old_id bigint;
BEGIN
    IF NEW.original_data_id IS NOT NULL THEN
        BEGIN
            SELECT nodes.id
            INTO old_id
            FROM nodes
            WHERE original_data_id = NEW.original_data_id
              AND metatype_id = NEW.metatype_id
              AND data_source_id = NEW.data_source_id LIMIT 1;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                old_id := NULL;
        END;

        IF old_id IS NOT NULL THEN
            NEW.id = old_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER node_insert_trigger BEFORE INSERT ON default_node_partition
    FOR EACH ROW EXECUTE PROCEDURE node_insert_trigger();

/*
the views for current_nodes and current_edges must be recalculated to show only
non deleted_at records AND remove any duplicated id's
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
);