ALTER TABLE type_mapping_transformations ADD column tags jsonb DEFAULT NULL;
ALTER TABLE edge_queue_items ADD column tags jsonb DEFAULT NULL;