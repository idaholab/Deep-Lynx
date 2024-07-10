-- add origin metatype name and destination metatype name to transformations table
-- in order to preserve metatypes for inherited relationships when importing mappings
ALTER TABLE type_mapping_transformations ADD COLUMN IF NOT EXISTS origin_metatype_name text DEFAULT NULL;
ALTER TABLE type_mapping_transformations ADD COLUMN IF NOT EXISTS destination_metatype_name text DEFAULT NULL;