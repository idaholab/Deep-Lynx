ALTER TABLE edges DROP CONSTRAINT IF EXISTS edge_unique_constraint_edges_new;

ALTER TABLE edges ADD CONSTRAINT edge_unique_constraint_edges_new 
	UNIQUE (container_id, relationship_pair_id, data_source_id, created_at, origin_original_id, destination_original_id);