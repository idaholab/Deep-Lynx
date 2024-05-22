/* see pt1 for info */
UPDATE nodes
    SET new_data_staging_id = data_staging.new_id
    FROM data_staging WHERE nodes.data_staging_id = data_staging.id;

UPDATE edges
    SET new_data_staging_id = data_staging.new_id
    FROM data_staging WHERE edges.data_staging_id = data_staging.id;

UPDATE data_staging_files
    SET new_data_staging_id = data_staging.new_id
    FROM data_staging WHERE data_staging_files.data_staging_id = data_staging.id;
