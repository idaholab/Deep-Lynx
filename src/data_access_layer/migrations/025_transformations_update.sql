ALTER TABLE type_mapping_transformations ADD COLUMN tab_data_source_id bigint DEFAULT NULL REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE type_mapping_transformations ADD COLUMN tab_metatype_id bigint DEFAULT NULL REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE type_mapping_transformations ADD COLUMN tab_node_id bigint DEFAULT NULL;
ALTER TABLE type_mapping_transformations ADD COLUMN tab_node_key text DEFAULT NULL;

