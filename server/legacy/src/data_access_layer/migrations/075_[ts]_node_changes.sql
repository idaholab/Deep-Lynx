/*
 In this migration we're moving the nodes/edges table off of the hypertables since we're going to abandon timescaledb
 due to the fact that its performance hasn't been great. We're only moving the tables off hypertables. Next migration
 will take care of all the primary keys. We won't worry about recreating the indexes here since we're about to drop
 them all anyways
 */
SELECT * INTO nodes_migration FROM nodes;
SELECT * INTO edges_migration FROM edges;

/* must remove all the views and functions before dropping the tables */
DROP VIEW current_edges;
DROP VIEW current_nodes;
DROP MATERIALIZED VIEW current_nodes_cache;
DROP TABLE nodes;
DROP TABLE edges;
DROP FUNCTION link_edge;

/* we're going to recreate the tables so we get the foreign keys */
CREATE TABLE IF NOT EXISTS nodes
(
    id bigserial NOT NULL,
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
    metadata_properties jsonb,
    CONSTRAINT nodes_pkey PRIMARY KEY (id, created_at),
    CONSTRAINT nodes_container_id_fkey FOREIGN KEY (container_id)
        REFERENCES public.containers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT nodes_data_source_id_fkey FOREIGN KEY (data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT nodes_import_data_id_fkey FOREIGN KEY (import_data_id)
        REFERENCES public.imports (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT nodes_metatype_id_fkey FOREIGN KEY (metatype_id)
        REFERENCES public.metatypes (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT nodes_type_mapping_transformation_id_fkey FOREIGN KEY (type_mapping_transformation_id)
        REFERENCES public.type_mapping_transformations (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL
) PARTITION BY RANGE (created_at);


CREATE TABLE IF NOT EXISTS edges
(
    id bigserial NOT NULL,
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
    modified_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    created_by character varying COLLATE pg_catalog."default",
    modified_by character varying COLLATE pg_catalog."default",
    data_staging_id uuid,
    metadata_properties jsonb,
    CONSTRAINT edges_pkey PRIMARY KEY (id, created_at),
    CONSTRAINT edges_container_id_fkey FOREIGN KEY (container_id)
        REFERENCES public.containers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT edges_data_source_id_fkey FOREIGN KEY (data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_destination_data_source_id_fkey FOREIGN KEY (destination_data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_destination_metatype_id_fkey FOREIGN KEY (destination_metatype_id)
        REFERENCES public.metatypes (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_import_data_id_fkey FOREIGN KEY (import_data_id)
        REFERENCES public.imports (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_origin_data_source_id_fkey FOREIGN KEY (origin_data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_origin_metatype_id_fkey FOREIGN KEY (origin_metatype_id)
        REFERENCES public.metatypes (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_relationship_pair_id_fkey FOREIGN KEY (relationship_pair_id)
        REFERENCES public.metatype_relationship_pairs (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT edges_type_mapping_transformation_id_fkey FOREIGN KEY (type_mapping_transformation_id)
        REFERENCES public.type_mapping_transformations (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL
) PARTITION BY RANGE (created_at);

SELECT * INTO nodes FROM nodes_migration;
SELECT * INTO edges FROM edges_migration;
