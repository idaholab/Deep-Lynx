ALTER TABLE metatypes 
DROP CONSTRAINT metatypes_container_id_fkey,
ADD CONSTRAINT metatypes_container_id_fkey
   FOREIGN KEY (container_id)
   REFERENCES containers(id)
   ON DELETE CASCADE;
ALTER TABLE metatype_relationship_pairs 
DROP CONSTRAINT metatype_relationship_pairs_container_id_fkey,
ADD CONSTRAINT metatype_relationship_pairs_container_id_fkey
   FOREIGN KEY (container_id)
   REFERENCES containers(id)
   ON DELETE CASCADE;
ALTER TABLE exports 
DROP CONSTRAINT exports_container_id_fkey,
ADD CONSTRAINT exports_container_id_fkey
   FOREIGN KEY (container_id)
   REFERENCES containers(id)
   ON DELETE CASCADE;
ALTER TABLE data_sources 
DROP CONSTRAINT data_sources_container_id_fkey,
ADD CONSTRAINT data_sources_container_id_fkey
   FOREIGN KEY (container_id)
   REFERENCES containers(id)
   ON DELETE CASCADE;
ALTER TABLE files 
DROP CONSTRAINT files_container_id_fkey,
ADD CONSTRAINT files_container_id_fkey
   FOREIGN KEY (container_id)
   REFERENCES containers(id)
   ON DELETE CASCADE;