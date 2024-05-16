CREATE OR REPLACE FUNCTION node_insert_trigger() RETURNS TRIGGER AS $$
DECLARE
    old_id bigint;
    old_properties jsonb;
BEGIN
    IF NEW.original_data_id IS NOT NULL THEN
        BEGIN
            SELECT nodes.id, nodes.properties
            INTO old_id, old_properties
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
/*
 if the old properties are exactly the same as the new properties, silently discard the insert
 */
            IF old_properties IS NOT DISTINCT FROM NEW.properties THEN
                RETURN NULL;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language plpgsql;