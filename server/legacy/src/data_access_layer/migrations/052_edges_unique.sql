DELETE FROM edges e USING edges b
       WHERE e.id > b.id
         AND e.origin_id = b.origin_id
         AND e.destination_id = b.destination_id
         AND e.relationship_pair_id = b.relationship_pair_id
         AND e.created_at = b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS edges_uniq_idx ON edges (container_id,relationship_pair_id,data_source_id,created_at, origin_id, destination_id);