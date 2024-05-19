ALTER TABLE data_staging ADD COLUMN nodes_processed_at TIMESTAMP DEFAULT NULL;
ALTER TABLE data_staging ADD COLUMN edges_processed_at TIMESTAMP DEFAULT NULL;

/*
 These two tables are temp tables that allow use to quickly insert nodes and edges from the processing stream without
 any of the unique constraints - the only index we keep is import-id since we will need to remove records by import-id
 at the end of the process - id key is unique to this table to let us deduplicate later
 */
CREATE TABLE IF NOT EXISTS nodes_temp
(
    id uuid DEFAULT gen_random_uuid(),
    container_id bigint NOT NULL,
    metatype_id bigint NOT NULL,
    data_source_id bigint,
    import_data_id bigint,
    type_mapping_transformation_id bigint,
    original_data_id text COLLATE pg_catalog."default",
    properties jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    created_by character varying COLLATE pg_catalog."default",
    modified_by character varying COLLATE pg_catalog."default",
    data_staging_id uuid,
    metadata_properties jsonb
);

CREATE INDEX nodes_temp_import_idx ON nodes_temp(import_data_id);


CREATE TABLE IF NOT EXISTS edges_temp
(
    id uuid DEFAULT gen_random_uuid(),
    container_id bigint NOT NULL,
    relationship_pair_id bigint NOT NULL,
    data_source_id bigint,
    import_data_id bigint,
    type_mapping_transformation_id bigint,
    origin_id bigint,
    destination_id bigint,
    origin_original_id text COLLATE pg_catalog."default",
    origin_data_source_id bigint,
    origin_metatype_id bigint,
    destination_original_id text COLLATE pg_catalog."default",
    destination_data_source_id bigint,
    destination_metatype_id bigint,
    properties jsonb,
    metadata jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    created_by character varying COLLATE pg_catalog."default",
    modified_by character varying COLLATE pg_catalog."default",
    data_staging_id uuid,
    metadata_properties jsonb
);

CREATE INDEX edges_temp_import_idx ON edges_temp(import_data_id);
