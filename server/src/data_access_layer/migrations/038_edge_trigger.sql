CREATE OR REPLACE FUNCTION edge_insert_trigger() RETURNS TRIGGER AS $$
DECLARE
    old_id bigint;
BEGIN
        BEGIN
            IF NEW.origin_id IS NOT NULL AND NEW.destination_id IS NOT NULL THEN
                BEGIN
                    SELECT edges.id
                    INTO old_id
                    FROM edges
                    WHERE origin_id = NEW.origin_id AND destination_id = NEW.destination_id AND relationship_pair_id = NEW.relationship_pair_id LIMIT 1;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        old_id := NULL;
                END;
            END IF;

            IF NEW.origin_id IS NULL AND NEW.destination_id IS NULL THEN
                BEGIN
                    SELECT edges.id
                    INTO old_id
                    FROM edges
                    WHERE origin_original_id = NEW.origin_original_id
                      AND destination_original_id = NEW.destination_original_id
                      AND origin_data_source_id =  NEW.origin_data_source_id
                      AND destination_data_source_id = NEW.destination_data_source_id
                      AND origin_metatype_id = NEW.origin_metatype_id
                      AND destination_metatype_id = NEW.destination_metatype_id
                      AND relationship_pair_id = NEW.relationship_pair_id LIMIT 1;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        old_id := NULL;
                END;
            END IF;

        END;

        IF old_id IS NOT NULL THEN
            NEW.id = old_id;
        END IF;
    RETURN NEW;
END;
$$ language plpgsql;