ALTER TABLE containers DROP CONSTRAINT containers_name_key;
DROP INDEX name;

CREATE UNIQUE INDEX container_name_user ON containers(name, created_by);
