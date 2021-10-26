CREATE OR REPLACE FUNCTION link_edge(edge edges) RETURNS void AS $$
DECLARE
    origin_node_id bigint;
    destination_node_id bigint;
BEGIN
    IF edge.origin_id IS NULL THEN
        BEGIN
            SELECT nodes.id
            INTO origin_node_id
            FROM nodes
            WHERE original_data_id = edge.origin_original_id
            AND data_source_id = edge.origin_data_source_id
            AND metatype_id = edge.origin_metatype_id
            LIMIT 1;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                origin_node_id := NULL;
        END;

        IF origin_node_id IS NOT NULL THEN
           /*
            when updating the edge, we actually update instead of insert a new
            record because we are attempting to make the connection that should
            have existed in the first place. Make sure to use the created_at field
            in the WHERE to insure uniqueness of the edge record you are updating
            */
           UPDATE edges SET origin_id = origin_node_id
            WHERE id = edge.id
              AND created_at = edge.created_at;
        END IF;
    END IF;

    IF edge.destination_id IS NULL THEN
        BEGIN
            SELECT nodes.id
            INTO destination_node_id
            FROM nodes
            WHERE original_data_id = edge.destination_original_id
              AND data_source_id = edge.destination_data_source_id
              AND metatype_id = edge.destination_metatype_id
            LIMIT 1;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                destination_node_id := NULL;
        END;

        IF destination_node_id IS NOT NULL THEN
            /*
             when updating the edge, we actually update instead of insert a new
             record because we are attempting to make the connection that should
             have existed in the first place. Make sure to use the created_at field
             in the WHERE to insure uniqueness of the edge record you are updating
             */
            UPDATE edges SET destination_id = destination_node_id
            WHERE id = edge.id
              AND created_at = edge.created_at;
        END IF;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;