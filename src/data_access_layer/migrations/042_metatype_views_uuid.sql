DROP VIEW IF EXISTS metatypes_view;
DROP VIEW IF EXISTS metatype_relationships_view;

CREATE VIEW metatypes_view AS (
  SELECT DISTINCT metatypes.*, metatypes_inheritance.parent_id AS parent_id
  FROM metatypes_inheritance
           FULL OUTER JOIN metatypes ON metatypes.id = metatypes_inheritance.child_id
      );

CREATE VIEW metatype_relationships_view AS (
   SELECT metatype_relationships.*, metatype_relationships_inheritance.parent_id AS parent_id
   FROM metatype_relationships_inheritance
            FULL OUTER JOIN metatype_relationships ON metatype_relationships.id = metatype_relationships_inheritance.child_id
       );