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
		WHERE data::jsonb->> arg.relationship_type_key = arg.relationship_type_value
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
		WHERE data::jsonb->> NEW.relationship_type_key = NEW.relationship_type_value
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

ALTER TABLE IF EXISTS data_type_mappings
ADD COLUMN relationship_type_key text,
ADD COLUMN action_value text,
ADD COLUMN relationship_type_value text;

ALTER TABLE IF EXISTS data_staging
DROP COLUMN valid;

ALTER TABLE IF EXISTS nodes
DROP COLUMN created_by,
DROP COLUMN modified_by,
ALTER COLUMN modified_at DROP NOT NULL,
ALTER COLUMN modified_at DROP DEFAULT,
ADD COLUMN deleted_at timestamp;

ALTER TABLE IF EXISTS edges
DROP COLUMN created_by,
DROP COLUMN modified_by,
ALTER COLUMN modified_at DROP NOT NULL,
ALTER COLUMN modified_at DROP DEFAULT,
ADD COLUMN deleted_at timestamp;

CREATE UNIQUE INDEX container_graph_active_unique ON active_graphs (graph_id, container_id);
