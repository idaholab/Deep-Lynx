ALTER TABLE type_mapping_transformations ADD column origin_parameters jsonb DEFAULT NULL;
ALTER TABLE type_mapping_transformations ADD column destination_parameters jsonb DEFAULT NULL;
