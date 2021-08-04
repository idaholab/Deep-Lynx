ALTER TABLE data_sources ADD COLUMN status text DEFAULT 'ready'::text;
ALTER TABLE data_sources ADD COLUMN status_message text;