ALTER TABLE files ADD COLUMN container_id uuid REFERENCES containers(id);
