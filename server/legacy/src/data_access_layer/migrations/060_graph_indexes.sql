CREATE INDEX IF NOT EXISTS node_container_id_index ON nodes (container_id);
CREATE INDEX IF NOT EXISTS node_metatype_id_index ON nodes (metatype_id);
CREATE INDEX IF NOT EXISTS node_data_source_id_index ON nodes (data_source_id);
CREATE INDEX IF NOT EXISTS node_properties_index ON nodes USING gin(properties);
CREATE INDEX IF NOT EXISTS edge_container_id_index ON edges (container_id);
CREATE INDEX IF NOT EXISTS edge_relationship_pair_id_index ON edges (relationship_pair_id);
CREATE INDEX IF NOT EXISTS edge_origin_id_index ON edges (origin_id);
CREATE INDEX IF NOT EXISTS edge_destination_id_index ON edges (destination_id);
CREATE INDEX IF NOT EXISTS edge_data_source_id_index ON edges (data_source_id);