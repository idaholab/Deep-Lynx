DROP function unpack_import_row CASCADE;

CREATE OR REPLACE FUNCTION public.unpack_import_row(arg_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
	_rec record;
BEGIN
	SELECT INTO _rec imports.data_json, imports.id FROM imports WHERE imports.id = arg_id;

    IF _rec.data_json IS NOT NULL THEN
    	INSERT INTO data_staging(data, data_source_id, import_id)
    	SELECT value, imports.data_source_id, imports.id
    		FROM jsonb_array_elements((SELECT data_json from imports WHERE imports.id = _rec.id))
    		CROSS JOIN imports WHERE imports.id = _rec.id;
    END IF;

	RETURn;
END;
$function$
