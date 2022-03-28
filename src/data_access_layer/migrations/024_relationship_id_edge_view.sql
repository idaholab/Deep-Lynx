/*Adding relationship id to current edges view*/

DROP VIEW IF EXISTS current_edges;

CREATE VIEW current_edges AS (
	SELECT DISTINCT ON (edges.id)
		edges.*,
		metatype_relationship_pairs.relationship_id,
		metatype_relationships.name AS metatype_relationship_name
   FROM edges
     LEFT JOIN metatype_relationship_pairs ON edges.relationship_pair_id = metatype_relationship_pairs.id
     LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id
  WHERE edges.deleted_at IS NULL
  ORDER BY edges.id, edges.created_at DESC
);