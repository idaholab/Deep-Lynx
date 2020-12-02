CREATE TABLE IF NOT EXISTS registered_events (
    id uuid NOT NULL UNIQUE,
    app_name text NOT NULL,
    app_url text NOT NULL,
    data_source_id uuid REFERENCES data_sources(id) ON DELETE CASCADE,
    container_id uuid REFERENCES containers(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);

ALTER TABLE IF EXISTS nodes
DROP COLUMN import_data_id,
ADD COLUMN data_staging_id integer REFERENCES data_staging(id) ON DELETE SET NULL,
ADD COLUMN import_data_id uuid REFERENCES imports(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS edges
DROP COLUMN import_data_id,
ADD COLUMN data_staging_id integer REFERENCES data_staging(id) ON DELETE SET NULL,
ADD COLUMN import_data_id uuid REFERENCES imports(id) ON DELETE CASCADE;
