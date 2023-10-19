DROP FUNCTION IF EXISTS get_metatype_keys;

CREATE OR REPLACE FUNCTION public.get_metatype_keys(arg_metatype_id bigint, arg_container_id bigint)
    RETURNS SETOF metatype_full_keys
    LANGUAGE sql
AS $$
WITH RECURSIVE parents AS (
    SELECT * FROM metatypes_view
    WHERE id = arg_metatype_id
    UNION
    SELECT v.* from metatypes_view v INNER JOIN parents p ON p.parent_id = v.id WHERE v.container_id = arg_container_id
) SELECT mk.id, mk.metatype_id, p.name AS metatype_name, mk.name,
         mk.description, mk.required, mk.property_name, mk.data_type,
         mk.options, mk.default_value, mk.validation, mk.created_at,
         mk.modified_at, mk.created_by, mk.modified_by, mk.ontology_version,
         mk.container_id, mk.deleted_at
FROM parents p INNER JOIN metatype_keys mk ON mk.metatype_id = p.id;
$$;