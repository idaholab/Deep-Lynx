CREATE OR REPLACE FUNCTION set_type_mapping(arg data_type_mappings)
	RETURNS void
	language plpgsql
as $$
DECLARE
BEGIN
	IF arg.metatype_id IS NOT NULL THEN
		UPDATE data_staging SET mapping_id = arg.id
		WHERE data::jsonb->> arg.type_key = arg.type_value
		AND data::jsonb ? arg.unique_identifier_key
		AND data_source_id = arg.data_source_id
		AND mapping_id IS NULL;

		RETURN;
	END IF;

	IF arg.metatype_relationship_id IS NOT NULL THEN
		UPDATE data_staging SET mapping_id = arg.id
		WHERE data::jsonb->> arg.type_key = arg.type_value
		AND data::jsonb ? arg.unique_identifier_key
		AND data::jsonb ? arg.origin_key
		AND data::jsonb ? arg.destination_key
		AND data_source_id = arg.data_source_id
		AND mapping_id IS NULL;

		RETURN;
	END IF;

END;
$$;

CREATE OR REPLACE FUNCTION set_type_mapping_trigger()
	RETURNS TRIGGER
	language plpgsql
as $$
DECLARE
BEGIN
	IF NEW.metatype_id IS NOT NULL THEN
		UPDATE data_staging SET mapping_id = NEW.id
		WHERE data::jsonb->> NEW.type_key = NEW.type_value
		AND data::jsonb ? NEW.unique_identifier_key
		AND data_source_id = NEW.data_source_id
		AND mapping_id IS NULL;

		RETURN NULL;
	END IF;

	IF NEW.metatype_relationship_id IS NOT NULL THEN
		UPDATE data_staging SET mapping_id = NEW.id
		WHERE data::jsonb->> NEW.type_key = NEW.type_value
		AND data::jsonb ? NEW.unique_identifier_key
		AND data::jsonb ? NEW.origin_key
		AND data::jsonb ? NEW.destination_key
		AND data_source_id = NEW.data_source_id
		AND mapping_id IS NULL;

		RETURN NULL;
	END IF;

	RETURN NULL;
END;
$$;

CREATE TRIGGER set_type_mappings_new
	AFTER INSERT
		ON data_type_mappings
	FOR EACH ROW
	EXECUTE PROCEDURE set_type_mapping_trigger();

ALTER TABLE IF EXISTS edges
ADD COLUMN origin_node_original_id text,
ADD COLUMN destination_node_original_id text;
