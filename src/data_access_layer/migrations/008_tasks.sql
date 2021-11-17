DROP TABLE IF EXISTS tasks;
CREATE TABLE IF NOT EXISTS tasks (
    id bigserial,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    task_type text,
    status text DEFAULT 'ready'::text,
    status_message text,
    query text,
    data jsonb,
    config jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by varchar NOT NULL,
    modified_by varchar NOT NULL,
    primary key(id)
);