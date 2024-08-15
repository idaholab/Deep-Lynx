--  Drop the tsvector column
ALTER TABLE hash_groupings DROP COLUMN shape_hash_tsvector;

--  Change the column definitions
ALTER TABLE hash_groupings DROP CONSTRAINT hash_groupings_pkey;
ALTER TABLE hash_groupings ALTER COLUMN hash_grouping_id SET DATA TYPE bigint;
ALTER TABLE hash_groupings ADD PRIMARY KEY (hash_grouping_id);
ALTER TABLE hash_groupings ADD FOREIGN KEY (hash_grouping_id) REFERENCES type_mappings(id) ON UPDATE CASCADE ON DELETE CASCADE;

--  Ensure the unique constraint is still valid
ALTER TABLE hash_groupings ADD CONSTRAINT unique_type_mapping_shape_hash UNIQUE(type_mapping_id, shape_hash);

--  Drop the index on tsvector if exists
DROP INDEX IF EXISTS idx_new_shape_hashes_tsvector;

--  Remove the primary key constraint
ALTER TABLE public.hash_groupings
DROP CONSTRAINT IF EXISTS hash_groupings_pkey;

DROP VIEW IF EXISTS grouped_type_mappings;
CREATE VIEW grouped_type_mappings AS
SELECT 
    id, 
    container_id, 
    data_source_id, 
    active, 
    created_at, 
    modified_at, 
    sample_payload, 
    shape_hash, 
    modified_by, 
    created_by
FROM 
    public.type_mappings
WHERE 
    id NOT IN (SELECT hash_grouping_id FROM public.hash_groupings);

