ALTER TABLE data_staging DROP COLUMN mapping_id;
ALTER TABLE data_staging ADD COLUMN shape_hash text;