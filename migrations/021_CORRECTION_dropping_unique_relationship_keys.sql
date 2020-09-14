ALTER TABLE metatypes DROP CONSTRAINT IF EXISTS metatypes_name_key;
ALTER TABLE metatypes DROP CONSTRAINT IF EXISTS metatype_name;

ALTER TABLE metatypes ADD CONSTRAINT metatypes_name_container_id_un UNIQUE (container_id, name);
