CREATE TYPE file_upload_adapters as ENUM('aws_s3', 'filesystem', 'azure_blob');

CREATE TABLE IF NOT EXISTS files(
    id uuid NOT NULL,
    file_name text NOT NULL,
    file_size bigint NOT NULL,
    adapter_file_path text NOT NULL,
    adapter file_upload_adapters NOT NULL,
    metadata jsonb,
    data_source_id uuid REFERENCES data_sources(id) ON DELETE NO ACTION,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);
