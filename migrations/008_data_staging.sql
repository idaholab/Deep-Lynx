CREATE TABLE IF NOT EXISTS data_staging(
    id SERIAL PRIMARY KEY,
    data_source_id uuid REFERENCES data_sources(id) ON DELETE CASCADE,
    import_id uuid REFERENCES imports(id) ON DELETE CASCADE,
    mapping_id uuid REFERENCES data_type_mappings(id) ON DELETE SET NULL,
    errors text[],
    valid boolean,
    data jsonb,
    inserted_at timestamp,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);


DROP TRIGGER IF EXISTS unpack_import on imports;
DROP FUNCTION IF EXISTS unpack_import_row();

CREATE OR REPLACE FUNCTION unpack_import_row()
	RETURNS TRIGGER
	language plpgsql
as $$
DECLARE
BEGIN
    IF NEW.data_json IS NOT NULL THEN
    	INSERT INTO data_staging(data, data_source_id, import_id)
    	SELECT value, imports.data_source_id, imports.id
    		FROM jsonb_array_elements((SELECT data_json from imports WHERE imports.id = NEW.id))
    		CROSS JOIN imports WHERE imports.id = NEW.id;
    END IF;

	RETURN NULL;
END;
$$;

CREATE TRIGGER unpack_import
	AFTER INSERT
		ON imports
	FOR EACH ROW
	EXECUTE PROCEDURE unpack_import_row();
