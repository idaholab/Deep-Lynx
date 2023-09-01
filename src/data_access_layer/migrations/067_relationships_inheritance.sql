DROP VIEW IF EXISTS metatype_relationships_view;

DROP TRIGGER IF EXISTS check_metatype_relationship_key ON metatype_relationship_keys;
DROP FUNCTION IF EXISTS check_metatype_relationship_key;
DROP FUNCTION IF EXISTS get_metatype_relationship_keys;

DROP TRIGGER IF EXISTS check_metatype_relationship_inheritance ON metatype_relationships_inheritance;
DROP FUNCTION IF EXISTS check_metatype_relationship_inheritance;
DROP TABLE IF EXISTS metatype_relationships_inheritance;

/*
 metatype_full_relationship_pairs is a flattened view of all owned and inherited relationship pairs
 for a given metatype
 */
CREATE MATERIALIZED VIEW IF NOT EXISTS metatype_full_relationship_pairs AS
WITH RECURSIVE parents AS (
    SELECT id, container_id, name, description, created_at,
           modified_at, created_by, modified_by, ontology_version,
           old_id, deleted_at, id AS pair_parent, 1 AS lvl
    FROM metatypes_view
    UNION
    SELECT v.id, v.container_id, v.name, v.description, v.created_at,
           v.modified_at, v.created_by, v.modified_by, v.ontology_version,
           v.old_id, v.deleted_at, p.pair_parent, p.lvl + 1
    FROM parents p JOIN metatypes_view v ON p.id = v.parent_id
) SELECT mk.id, mk.relationship_id, mk.origin_metatype_id AS metatype_id, p.id AS origin_metatype_id,
         mk.destination_metatype_id, mk.container_id,
         mk.relationship_type, mk.created_at, mk.modified_at,
         mk.created_by, mk.modified_by, mk.ontology_version, mk.deleted_at,
         p.lvl, origin.name AS origin_metatype_name,
         destination.name   AS destination_metatype_name,
         relationships.name AS relationship_name,
         origin.name || ' - ' || relationships.name || ' - ' || destination.name AS name
FROM parents p JOIN metatype_relationship_pairs mk ON p.pair_parent = mk.origin_metatype_id
LEFT JOIN metatypes origin ON p.id = origin.id
LEFT JOIN metatypes destination ON mk.destination_metatype_id = destination.id
LEFT JOIN metatype_relationships relationships ON mk.relationship_id = relationships.id
ORDER BY origin_metatype_id, mk.name;

CREATE INDEX IF NOT EXISTS full_pairs_metatype_id ON metatype_full_relationship_pairs (metatype_id);
CREATE INDEX IF NOT EXISTS full_pairs_container_id ON metatype_full_relationship_pairs (container_id);

REFRESH MATERIALIZED VIEW metatype_full_relationship_pairs;

/*
 get_metatype_relationship_pairs runs an iterative query to build all the pairs which the passed metatype
 inherits based on its parent
 */
CREATE OR REPLACE FUNCTION get_metatype_relationship_pairs(arg_metatype_id bigint, arg_container_id bigint) RETURNS setof metatype_full_relationship_pairs
AS $$
WITH RECURSIVE parents AS (
    SELECT id, container_id, name, description, created_at,
           modified_at, created_by, modified_by, ontology_version,
           old_id, deleted_at, id AS pair_parent, 1 AS lvl
    FROM metatypes_view
    WHERE container_id = arg_container_id
    UNION
    SELECT v.id, v.container_id, v.name, v.description, v.created_at,
           v.modified_at, v.created_by, v.modified_by, v.ontology_version,
           v.old_id, v.deleted_at, p.pair_parent, p.lvl + 1
    FROM parents p JOIN metatypes_view v ON p.id = v.parent_id WHERE v.container_id = arg_container_id
) SELECT mk.id, mk.relationship_id, mk.origin_metatype_id AS metatype_id, p.id AS origin_metatype_id,
         mk.destination_metatype_id, mk.container_id,
         mk.relationship_type, mk.created_at, mk.modified_at,
         mk.created_by, mk.modified_by, mk.ontology_version, mk.deleted_at,
         p.lvl, origin.name AS origin_metatype_name,
         destination.name   AS destination_metatype_name,
         relationships.name AS relationship_name,
         origin.name || ' - ' || relationships.name || ' - ' || destination.name AS name
FROM parents p JOIN metatype_relationship_pairs mk ON p.pair_parent = mk.origin_metatype_id
           LEFT JOIN metatypes origin ON p.id = origin.id
           LEFT JOIN metatypes destination ON mk.destination_metatype_id = destination.id
           LEFT JOIN metatype_relationships relationships ON mk.relationship_id = relationships.id
WHERE p.id = arg_metatype_id AND mk.container_id = arg_container_id
ORDER BY origin_metatype_id, mk.name
$$ LANGUAGE sql;

/*
 add container_id filter
 */
DROP FUNCTION IF EXISTS get_metatype_keys;

CREATE OR REPLACE FUNCTION get_metatype_keys(arg_metatype_id bigint, arg_container_id bigint) RETURNS setof metatype_keys
AS $$
WITH RECURSIVE parents AS (
    SELECT * FROM metatypes_view
    WHERE id = arg_metatype_id
    UNION
    SELECT v.* from metatypes_view v INNER JOIN parents p ON p.parent_id = v.id WHERE v.container_id = arg_container_id
) SELECT metatype_keys.* FROM parents p INNER JOIN metatype_keys ON metatype_keys.metatype_id = p.id;
$$ LANGUAGE sql;

/*
 drop unneeded description column on metatype relationship pairs
 */
ALTER TABLE metatype_relationship_pairs DROP COLUMN IF EXISTS description;

/*
 this function is used to autogenerate relationship pair names
 */
CREATE OR REPLACE FUNCTION generate_pair_name(arg_relationship_id bigint, arg_origin_id bigint, arg_destination_id bigint) RETURNS text
AS $$
SELECT origin.name || ' - ' || relationships.name || ' - ' || destination.name AS name
FROM metatypes origin
         JOIN metatypes destination ON arg_destination_id = destination.id
         JOIN metatype_relationships relationships ON arg_relationship_id = relationships.id
WHERE origin.id = arg_origin_id;
$$ LANGUAGE sql;

/*
 this function and trigger ensure that metatype relationship pairs cannot be created if
 a parent of the origin metatype has this same combination of relationship id and
 destination metatype id (prevents the creation of an inherited relationship pair)
 */
CREATE OR REPLACE FUNCTION public.check_relationship_pair_inheritance()
    RETURNS trigger
    LANGUAGE plpgsql
AS $function$
DECLARE
    metatype metatypes_view;
    parent_metatype metatypes_view;
BEGIN
    FOR metatype IN (SELECT * FROM metatypes_view WHERE id = NEW.origin_metatype_id) LOOP
            FOR parent_metatype IN ( WITH RECURSIVE parents AS (
                SELECT * FROM metatypes_view
                WHERE id = metatype.parent_id
                UNION
                SELECT v.* from metatypes_view v INNER JOIN parents p ON p.parent_id = v.id
            ) SELECT * FROM parents) LOOP

                    IF (SELECT count(*) FROM metatype_relationship_pairs
                        WHERE origin_metatype_id = parent_metatype.id
                          AND destination_metatype_id = NEW.destination_metatype_id
                          AND relationship_id = NEW.relationship_id) > 0 THEN
                        RAISE EXCEPTION 'proposed relationship pair (%) is in metatypes parents inheritance chain', NEW.name;
                    END IF;

                END LOOP;
        END LOOP;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER check_relationship_pair_inheritance BEFORE INSERT OR UPDATE ON metatype_relationship_pairs
    FOR EACH ROW EXECUTE FUNCTION check_relationship_pair_inheritance();
