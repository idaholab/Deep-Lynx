ALTER TABLE type_mapping_transformations ADD COLUMN type varchar(255) DEFAULT NULL;

UPDATE type_mapping_transformations SET type = 'node' WHERE metatype_id IS NOT NULL;
UPDATE type_mapping_transformations SET type = 'edge' WHERE metatype_relationship_pair_id IS NOT NULL;
