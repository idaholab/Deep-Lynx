CREATE UNIQUE INDEX IF NOT EXISTS edges_uniq_idx ON edges (container_id,relationship_pair_id,data_source_id,created_at, origin_id, destination_id);