DROP VIEW IF EXISTS metatype_relationships_view;

DROP TRIGGER IF EXISTS check_metatype_relationship_key ON metatype_relationship_keys;
DROP FUNCTION IF EXISTS check_metatype_relationship_key;
DROP FUNCTION IF EXISTS get_metatype_relationship_keys;

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
) SELECT mk.id, mk.relationship_id, p.id AS metatype_id, mk.origin_metatype_id,
         mk.destination_metatype_id, mk.container_id, mk.name, mk.description,
         mk.relationship_type, mk.created_at, mk.modified_at,
         mk.created_by, mk.modified_by, mk.ontology_version, mk.deleted_at,
         p.lvl, origin.name AS origin_metatype_name,
         destination.name   AS destination_metatype_name,
         relationships.name AS relationship_name
FROM parents p JOIN metatype_relationship_pairs mk ON p.pair_parent = mk.origin_metatype_id
LEFT JOIN metatypes origin ON mk.origin_metatype_id = origin.id
LEFT JOIN metatypes destination ON mk.destination_metatype_id = destination.id
LEFT JOIN metatype_relationships relationships ON mk.relationship_id = relationships.id
ORDER BY metatype_id, mk.name;

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
) SELECT mk.id, mk.relationship_id, p.id AS metatype_id, mk.origin_metatype_id,
         mk.destination_metatype_id, mk.container_id, mk.name, mk.description,
         mk.relationship_type, mk.created_at, mk.modified_at,
         mk.created_by, mk.modified_by, mk.ontology_version, mk.deleted_at,
         p.lvl, origin.name AS origin_metatype_name,
         destination.name   AS destination_metatype_name,
         relationships.name AS relationship_name
FROM parents p JOIN metatype_relationship_pairs mk ON p.pair_parent = mk.origin_metatype_id
           LEFT JOIN metatypes origin ON mk.origin_metatype_id = origin.id
           LEFT JOIN metatypes destination ON mk.destination_metatype_id = destination.id
           LEFT JOIN metatype_relationships relationships ON mk.relationship_id = relationships.id
WHERE p.id = arg_metatype_id AND mk.container_id = arg_container_id
ORDER BY metatype_id, mk.name
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
