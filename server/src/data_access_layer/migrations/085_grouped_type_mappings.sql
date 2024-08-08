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


--  SWITCHING THE FOLLOWING CODE BELOW WITH THE CODE ABOVE BECAUSE WE WANT TO SHOW UNGROUPED AND THE SINGLE GROUPED, BUT STILL WANT TO SHOW DUPLICATES AS WELL (SO CANT USE SHAPE HASH BUT RATHER OLD IDS)
-- CREATE VIEW grouped_type_mappings AS
-- -- Select rows from type_mappings where shape_hash is not in hash_groupings and shape_hash is not null
-- SELECT 
--     id, 
--     container_id, 
--     data_source_id, 
--     active, 
--     created_at, 
--     modified_at, 
--     sample_payload, 
--     shape_hash, 
--     modified_by, 
--     created_by
-- FROM 
--     public.type_mappings
-- WHERE 
--     shape_hash IS NOT NULL
--     AND shape_hash NOT IN (SELECT shape_hash FROM public.hash_groupings)
-- UNION
-- -- Select rows from type_mappings where shape_hash is null
-- SELECT 
--     id, 
--     container_id, 
--     data_source_id, 
--     active, 
--     created_at, 
--     modified_at, 
--     sample_payload, 
--     shape_hash, 
--     modified_by, 
--     created_by
-- FROM 
--     public.type_mappings
-- WHERE 
--     shape_hash IS NULL;


-- Step 1: Drop the tsvector column
ALTER TABLE hash_groupings DROP COLUMN shape_hash_tsvector;

-- Step 2: Change the column definitions
ALTER TABLE hash_groupings DROP CONSTRAINT hash_groupings_pkey;
ALTER TABLE hash_groupings ALTER COLUMN hash_grouping_id SET DATA TYPE bigint;
ALTER TABLE hash_groupings ADD PRIMARY KEY (hash_grouping_id);
ALTER TABLE hash_groupings ADD FOREIGN KEY (hash_grouping_id) REFERENCES type_mappings(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Step 3: Ensure the unique constraint is still valid
ALTER TABLE hash_groupings ADD CONSTRAINT unique_type_mapping_shape_hash UNIQUE(type_mapping_id, shape_hash);

-- Step 4: Drop the index on tsvector if exists
DROP INDEX IF EXISTS idx_new_shape_hashes_tsvector;


-- Step 1: Remove the primary key constraint
ALTER TABLE public.hash_groupings
DROP CONSTRAINT IF EXISTS hash_groupings_pkey;

-- Step 2: Ensure uniqueness on (type_mapping_id, shape_hash)
ALTER TABLE public.hash_groupings
ADD CONSTRAINT unique_type_mapping_shape_hash UNIQUE (type_mapping_id, shape_hash);