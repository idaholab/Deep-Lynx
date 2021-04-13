ALTER TABLE graphs ADD CONSTRAINT fk_containerID FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE;
