/*
 data target and related tables
 */
DROP TABLE IF EXISTS data_targets;
CREATE TABLE IF NOT EXISTS data_targets (
    id bigserial,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name text,
    adapter_type text,
    data_format text,
    active bool,
    config jsonb,
    last_run_at timestamp DEFAULT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by varchar NOT NULL,
    modified_by varchar NOT NULL,
    archived bool NOT NULL DEFAULT false,
    status text DEFAULT 'ready'::text,
    status_message text,
    PRIMARY KEY (id)
);