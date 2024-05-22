CREATE TABLE IF NOT EXISTS hash_groupings(
	hash_grouping_id BIGSERIAL PRIMARY KEY,
    type_mapping_id bigint REFERENCES type_mappings(id) ON UPDATE CASCADE ON DELETE CASCADE,
    shape_hash text NOT NULL,
    shape_hash_tsvector tsvector GENERATED ALWAYS AS (to_tsvector('english', shape_hash)) STORED,
    UNIQUE(type_mapping_id, shape_hash)
);
 
CREATE INDEX IF NOT EXISTS idx_new_shape_hashes_tsvector ON hash_groupings USING gin(shape_hash_tsvector);
 
ALTER TABLE type_mappings ALTER COLUMN shape_hash DROP NOT NULL;