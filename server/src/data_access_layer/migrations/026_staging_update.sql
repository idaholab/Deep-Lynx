/* deleting data_staging records should also remove nodes */
DELETE FROM nodes WHERE data_staging_id IN (SELECT id FROM data_staging WHERE import_id NOT IN (SELECT id FROM imports));
DELETE FROM edges WHERE data_staging_id IN (SELECT id FROM data_staging WHERE import_id NOT IN (SELECT id FROM imports));
DELETE FROM data_staging WHERE import_id NOT IN (SELECT id FROM imports);

ALTER TABLE data_staging ADD CONSTRAINT fk_imports FOREIGN KEY (import_id) REFERENCES imports(id) ON UPDATE CASCADE ON DELETE CASCADE;

/* deleting a data source should also delete its mappings */
DELETE FROM type_mappings WHERE data_source_id IS NULL;
ALTER TABLE type_mappings DROP CONSTRAINT type_mappings_data_source_id_fkey;
ALTER TABLE type_mappings ADD CONSTRAINT type_mappings_data_source_id_fkey FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE;