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
) SELECT mk.id, mk.relationship_id, mk.origin_metatype_id AS metatype_id, owner.name AS metatype_name,
         p.id AS origin_metatype_id, mk.destination_metatype_id, mk.container_id,
         mk.relationship_type, mk.created_at, mk.modified_at,
         mk.created_by, mk.modified_by, mk.ontology_version, mk.deleted_at,
         p.lvl, origin.name AS origin_metatype_name,
         destination.name   AS destination_metatype_name,
         relationships.name AS relationship_name,
         origin.name || ' - ' || relationships.name || ' - ' || destination.name AS name
FROM parents p JOIN metatype_relationship_pairs mk ON p.pair_parent = mk.origin_metatype_id
               LEFT JOIN metatypes owner ON mk.origin_metatype_id = owner.id
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
) SELECT mk.id, mk.relationship_id, mk.origin_metatype_id AS metatype_id, owner.name AS metatype_name,
         p.id AS origin_metatype_id, mk.destination_metatype_id, mk.container_id,
         mk.relationship_type, mk.created_at, mk.modified_at,
         mk.created_by, mk.modified_by, mk.ontology_version, mk.deleted_at,
         p.lvl, origin.name AS origin_metatype_name,
         destination.name   AS destination_metatype_name,
         relationships.name AS relationship_name,
         origin.name || ' - ' || relationships.name || ' - ' || destination.name AS name
FROM parents p JOIN metatype_relationship_pairs mk ON p.pair_parent = mk.origin_metatype_id
           LEFT JOIN metatypes owner ON mk.origin_metatype_id = owner.id
           LEFT JOIN metatypes origin ON p.id = origin.id
           LEFT JOIN metatypes destination ON mk.destination_metatype_id = destination.id
           LEFT JOIN metatype_relationships relationships ON mk.relationship_id = relationships.id
WHERE p.id = arg_metatype_id AND mk.container_id = arg_container_id
ORDER BY origin_metatype_id, mk.name
$$ LANGUAGE sql;

/*
 add container_id filter and metatype name
 */
DROP FUNCTION IF EXISTS get_metatype_keys;

CREATE OR REPLACE FUNCTION public.get_metatype_keys(arg_metatype_id bigint, arg_container_id bigint)
    RETURNS SETOF metatype_full_keys
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

DROP TRIGGER IF EXISTS check_relationship_pair_inheritance ON metatype_relationship_pairs;
CREATE TRIGGER check_relationship_pair_inheritance BEFORE INSERT OR UPDATE ON metatype_relationship_pairs
    FOR EACH ROW EXECUTE FUNCTION check_relationship_pair_inheritance();

/*
 rework the metatype keys view to include the metatype name
 */
DROP MATERIALIZED VIEW IF EXISTS metatype_full_keys;
CREATE MATERIALIZED VIEW IF NOT EXISTS metatype_full_keys AS
WITH RECURSIVE parents AS (
    SELECT id, container_id, name, description, created_at,
           modified_at, created_by, modified_by, ontology_version,
           old_id, deleted_at, id AS key_parent, 1 AS lvl
    FROM metatypes_view
    UNION
    SELECT v.id, v.container_id, v.name, v.description, v.created_at,
           v.modified_at, v.created_by, v.modified_by, v.ontology_version,
           v.old_id, v.deleted_at, p.key_parent, p.lvl + 1
    FROM parents p JOIN metatypes_view v ON p.id = v.parent_id
) SELECT mk.id, p.id AS metatype_id, p.name AS metatype_name, mk.name, mk.description,
         mk.required, mk.property_name, mk.data_type, mk.options,
         mk.default_value, mk.validation, mk.created_at, mk.modified_at,
         mk.created_by, mk.modified_by, mk.ontology_version,
         mk.container_id, mk.deleted_at
FROM parents p JOIN metatype_keys mk ON p.key_parent = mk.metatype_id
ORDER BY metatype_id, mk.name;

CREATE INDEX IF NOT EXISTS full_keys_metatype_id ON metatype_full_keys (metatype_id);
CREATE INDEX IF NOT EXISTS full_keys_container_id ON metatype_full_keys (container_id);

/*
 add parent_metatype_name to metatypes_view
 */
CREATE OR REPLACE VIEW metatypes_view AS (
     SELECT DISTINCT metatypes.*, metatypes_inheritance.parent_id AS parent_id, parent.name AS parent_name
     FROM metatypes_inheritance
              FULL OUTER JOIN metatypes ON metatypes.id = metatypes_inheritance.child_id
              LEFT JOIN metatypes parent ON parent.id = metatypes_inheritance.parent_id
         );

/*
 the check_metatype_key trigger ensures that no record can be created or updated when the property name
 matches that of an inherited key, as property names are unique per metatype.
 update function for get_metatype_keys and add trigger
 */
CREATE OR REPLACE FUNCTION check_metatype_key() RETURNS TRIGGER AS $$
DECLARE
    matched metatype_full_keys;
BEGIN
    IF NEW.metatype_id IS NULL THEN
        RAISE EXCEPTION 'metatype_id cannot be null';
    END IF;


    FOR matched IN (SELECT * FROM get_metatype_keys(NEW.metatype_id, NEW.container_id)
        WHERE property_name = NEW.property_name) LOOP
            IF matched.metatype_id <> NEW.metatype_id THEN
                RAISE EXCEPTION 'cannot add key, inherited key "%" shares property_name', NEW.name;
            END IF;
        END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_metatype_key BEFORE INSERT OR UPDATE ON metatype_keys
    FOR EACH ROW EXECUTE FUNCTION check_metatype_key();
