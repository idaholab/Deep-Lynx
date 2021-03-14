CREATE UNIQUE INDEX original_data_source_nodes ON nodes (original_data_id, data_source_id);
CREATE UNIQUE INDEX original_data_source_edges ON edges (original_data_id, data_source_id);
