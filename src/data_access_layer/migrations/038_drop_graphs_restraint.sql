ALTER TABLE graphs DROP CONSTRAINT graphs_container_id_fkey;
ALTER TABLE active_graphs DROP CONSTRAINT active_graphs_container_id_fkey;
ALTER TABLE users ALTER COLUMN identity_provider_id TYPE text using identity_provider_id::text;
