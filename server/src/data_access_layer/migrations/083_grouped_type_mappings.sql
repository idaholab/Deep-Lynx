CREATE VIEW grouped_type_mappings AS
-- Select rows from type_mappings where shape_hash is not in hash_groupings and shape_hash is not null
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
    shape_hash IS NOT NULL
    AND shape_hash NOT IN (SELECT shape_hash FROM public.hash_groupings)
UNION
-- Select rows from type_mappings where shape_hash is null
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
    shape_hash IS NULL;