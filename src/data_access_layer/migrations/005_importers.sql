CREATE TABLE IF NOT EXISTS data_sources(
    id uuid PRIMARY KEY,
    container_id uuid REFERENCES containers(id),
    name text,
    adapter_type text,
    data_format text,
    active boolean,
    config jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS imports(
    id uuid PRIMARY KEY,
    data_source_id uuid REFERENCES data_sources(id) ON DELETE CASCADE,
    started_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stopped_at timestamp,
    data_json jsonb,
    data_csv bytea,
    errors text[],

    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
)
