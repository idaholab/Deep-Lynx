DROP TRIGGER IF EXISTS node_insert_trigger ON nodes;

/*
the node insert trigger now accounts for metadata_properties
and ensures the correct old node will be returned based on created_at
 */
CREATE OR REPLACE FUNCTION node_insert_trigger() RETURNS TRIGGER AS $$
DECLARE
    old_id bigint;
    old_properties jsonb;
    old_metadata_properties jsonb;
BEGIN
    IF NEW.original_data_id IS NOT NULL THEN
        BEGIN
            SELECT nodes.id, nodes.properties, nodes.metadata_properties
            INTO old_id, old_properties, old_metadata_properties
            FROM nodes
            WHERE original_data_id = NEW.original_data_id
              AND metatype_id = NEW.metatype_id
              AND data_source_id = NEW.data_source_id
              AND created_at <= NEW.created_at::TIMESTAMP
            ORDER BY nodes.created_at DESC LIMIT 1;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                old_id := NULL;
        END;

        IF old_id IS NOT NULL THEN
            NEW.id = old_id;
/*
 if the old properties and metadata properties are exactly the same as the incoming, silently discard the insert
 */
            IF old_properties IS NOT DISTINCT FROM NEW.properties AND old_metadata_properties IS NOT DISTINCT FROM NEW.metadata_properties THEN
                RETURN NULL;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS node_insert_trigger ON nodes;

CREATE TRIGGER node_insert_trigger BEFORE INSERT ON nodes
    FOR EACH ROW EXECUTE PROCEDURE node_insert_trigger();
