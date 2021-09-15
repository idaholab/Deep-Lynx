ALTER TABLE nodes ADD COLUMN metadata jsonb;
ALTER TABLE edges ADD COLUMN metadata jsonb;
ALTER TABLE data_type_mapping_transformations ADD COLUMN config jsonb;
