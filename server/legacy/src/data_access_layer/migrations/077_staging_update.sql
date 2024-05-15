ALTER TABLE data_staging ADD COLUMN nodes_processed_at TIMESTAMP DEFAULT NULL;
ALTER TABLE data_staging ADD COLUMN edges_processed_at TIMESTAMP DEFAULT NULL;
