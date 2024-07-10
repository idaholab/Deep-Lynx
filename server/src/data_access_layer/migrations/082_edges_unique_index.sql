DROP INDEX IF EXISTS edges_uniq_idx;

CREATE UNIQUE INDEX IF NOT EXISTS edges_uniq_idx ON edges USING btree(
    container_id ASC NULLS LAST, 
    relationship_pair_id ASC NULLS LAST, 
    data_source_id ASC NULLS LAST, 
    created_at ASC NULLS LAST, 
    origin_id ASC NULLS LAST, 
    destination_id ASC NULLS LAST
);