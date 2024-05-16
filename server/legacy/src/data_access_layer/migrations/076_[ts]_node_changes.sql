/*
 In this migration we're moving the nodes/edges table off of the hypertables since we're going to abandon timescaledb
 due to the fact that its performance hasn't been great. We're only moving the tables off hypertables. Next migration
 will take care of all the primary keys.
 */
CREATE TABLE IF NOT EXISTS nodes_migration
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
    CONSTRAINT nodes_m_pkey PRIMARY KEY (id, created_at),
    CONSTRAINT nodes_m_container_id_fkey FOREIGN KEY (container_id)
        REFERENCES public.containers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT nodes_m_data_source_id_fkey FOREIGN KEY (data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT nodes_m_import_data_id_fkey FOREIGN KEY (import_data_id)
        REFERENCES public.imports (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT nodes_m_metatype_id_fkey FOREIGN KEY (metatype_id)
        REFERENCES public.metatypes (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT nodes_m_type_mapping_transformation_id_fkey FOREIGN KEY (type_mapping_transformation_id)
        REFERENCES public.type_mapping_transformations (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS edges_migration
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
    modified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    created_by character varying COLLATE pg_catalog."default",
    modified_by character varying COLLATE pg_catalog."default",
    data_staging_id uuid,
    metadata_properties jsonb,
    CONSTRAINT edges_m_pkey PRIMARY KEY (id, created_at),
    CONSTRAINT edges_m_container_id_fkey FOREIGN KEY (container_id)
        REFERENCES public.containers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT edges_m_data_source_id_fkey FOREIGN KEY (data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_m_destination_data_source_id_fkey FOREIGN KEY (destination_data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_m_destination_metatype_id_fkey FOREIGN KEY (destination_metatype_id)
        REFERENCES public.metatypes (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_m_import_data_id_fkey FOREIGN KEY (import_data_id)
        REFERENCES public.imports (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_m_origin_data_source_id_fkey FOREIGN KEY (origin_data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_m_origin_metatype_id_fkey FOREIGN KEY (origin_metatype_id)
        REFERENCES public.metatypes (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_m_relationship_pair_id_fkey FOREIGN KEY (relationship_pair_id)
        REFERENCES public.metatype_relationship_pairs (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT edges_m_type_mapping_transformation_id_fkey FOREIGN KEY (type_mapping_transformation_id)
        REFERENCES public.type_mapping_transformations (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS data_staging_migration(
     "data_source_id" int8,
     "import_id" int8 NOT NULL,
     "errors" text,
     "data" jsonb,
     "inserted_at" timestamp,
     "created_at" timestamp NOT NULL DEFAULT clock_timestamp(),
     "shape_hash" text,
     "id" uuid DEFAULT gen_random_uuid(),
     "file_attached" bool DEFAULT false,
     CONSTRAINT data_staging_m_data_source_id_fkey FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE,
     CONSTRAINT "fk_m_imports" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

/* move the data over now, this part could take a while */
INSERT INTO nodes_migration SELECT * FROM nodes;
INSERT INTO edges_migration SELECT * FROM edges;
INSERT INTO data_staging_migration SELECT * FROM data_staging;

/* must remove all the views and functions before dropping the tables */
DROP VIEW IF EXISTS current_edges;
DROP VIEW IF EXISTS current_nodes;
DROP MATERIALIZED VIEW IF EXISTS current_nodes_cache;
DROP TABLE IF EXISTS nodes;
DROP TABLE IF EXISTS edges;
DROP TABLE IF EXISTS data_staging;
DROP FUNCTION IF EXISTS link_edge;

/* now rebuild the tables and views */
ALTER TABLE data_staging_migration RENAME TO data_staging;

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
    CONSTRAINT nodes_mx_pkey PRIMARY KEY (id, created_at),
    CONSTRAINT nodes_mx_container_id_fkey FOREIGN KEY (container_id)
        REFERENCES public.containers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT nodes_mx_data_source_id_fkey FOREIGN KEY (data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT nodes_mx_import_data_id_fkey FOREIGN KEY (import_data_id)
        REFERENCES public.imports (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT nodes_mx_metatype_id_fkey FOREIGN KEY (metatype_id)
        REFERENCES public.metatypes (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT nodes_mx_type_mapping_transformation_id_fkey FOREIGN KEY (type_mapping_transformation_id)
        REFERENCES public.type_mapping_transformations (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL
)PARTITION BY RANGE(created_at);


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
    modified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    created_by character varying COLLATE pg_catalog."default",
    modified_by character varying COLLATE pg_catalog."default",
    data_staging_id uuid,
    metadata_properties jsonb,
    CONSTRAINT edges_mx_pkey PRIMARY KEY (id, created_at),
    CONSTRAINT edges_mx_container_id_fkey FOREIGN KEY (container_id)
        REFERENCES public.containers (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT edges_mx_data_source_id_fkey FOREIGN KEY (data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_mx_destination_data_source_id_fkey FOREIGN KEY (destination_data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_mx_destination_metatype_id_fkey FOREIGN KEY (destination_metatype_id)
        REFERENCES public.metatypes (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_mx_import_data_id_fkey FOREIGN KEY (import_data_id)
        REFERENCES public.imports (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_mx_origin_data_source_id_fkey FOREIGN KEY (origin_data_source_id)
        REFERENCES public.data_sources (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_mx_origin_metatype_id_fkey FOREIGN KEY (origin_metatype_id)
        REFERENCES public.metatypes (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT edges_mx_relationship_pair_id_fkey FOREIGN KEY (relationship_pair_id)
        REFERENCES public.metatype_relationship_pairs (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT edges_mx_type_mapping_transformation_id_fkey FOREIGN KEY (type_mapping_transformation_id)
        REFERENCES public.type_mapping_transformations (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE SET NULL
)PARTITION BY RANGE(created_at);;


CREATE TABLE IF NOT EXISTS default_node_partition PARTITION OF nodes DEFAULT;
CREATE TABLE IF NOT EXISTS default_edge_partition PARTITION OF edges DEFAULT;
INSERT INTO nodes SELECT * FROM nodes_migration;
INSERT INTO edges SELECT * FROM edges_migration;
DROP TABLE IF EXISTS nodes_migration;
DROP TABLE IF EXISTS edges_migration;

CREATE VIEW current_edges AS(SELECT DISTINCT ON (edges.origin_id, edges.destination_id, edges.data_source_id, edges.relationship_pair_id) edges.id,
        edges.container_id,
        edges.relationship_pair_id,
        edges.data_source_id,
        edges.import_data_id,
        edges.data_staging_id,
        edges.type_mapping_transformation_id,
        edges.origin_id,
        edges.origin_original_id,
        edges.origin_data_source_id,
        edges.origin_metatype_id,
        origin.uuid AS origin_metatype_uuid,
    edges.destination_id,
    edges.destination_original_id,
    edges.destination_data_source_id,
    edges.destination_metatype_id,
    destination.uuid AS destination_metatype_uuid,
    edges.properties,
    edges.metadata_properties,
    edges.metadata,
    edges.created_at,
    edges.modified_at,
    edges.deleted_at,
    edges.created_by,
    edges.modified_by,
    metatype_relationship_pairs.relationship_id,
    metatype_relationships.name AS metatype_relationship_name,
    metatype_relationships.uuid AS metatype_relationship_uuid,
    metatype_relationship_pairs.uuid AS metatype_relationship_pair_uuid
    FROM ((((edges
    LEFT JOIN metatype_relationship_pairs ON ((edges.relationship_pair_id = metatype_relationship_pairs.id)))
    LEFT JOIN metatype_relationships ON ((metatype_relationship_pairs.relationship_id = metatype_relationships.id)))
    LEFT JOIN metatypes origin ON ((edges.origin_metatype_id = origin.id)))
    LEFT JOIN metatypes destination ON ((edges.destination_metatype_id = destination.id)))
    WHERE (edges.deleted_at IS NULL)
    ORDER BY edges.origin_id, edges.destination_id, edges.data_source_id, edges.relationship_pair_id, edges.id, edges.created_at DESC);

CREATE VIEW current_nodes AS(SELECT DISTINCT ON (nodes.id) nodes.id,
    nodes.container_id,
    nodes.metatype_id,
    nodes.data_source_id,
    nodes.import_data_id,
    nodes.data_staging_id,
    nodes.type_mapping_transformation_id,
    nodes.original_data_id,
    nodes.properties,
    nodes.metadata_properties,
    nodes.metadata,
    nodes.created_at,
    nodes.modified_at,
    nodes.deleted_at,
    nodes.created_by,
    nodes.modified_by,
    metatypes.name AS metatype_name,
    metatypes.uuid AS metatype_uuid
FROM (nodes
LEFT JOIN metatypes ON ((metatypes.id = nodes.metatype_id)))
WHERE (nodes.deleted_at IS NULL)
ORDER BY nodes.id, nodes.created_at DESC);

CREATE MATERIALIZED VIEW current_nodes_cache AS( SELECT DISTINCT ON (nodes.id) nodes.id,
   nodes.container_id,
   nodes.metatype_id,
   nodes.data_source_id,
   nodes.import_data_id,
   nodes.data_staging_id,
   nodes.type_mapping_transformation_id,
   nodes.original_data_id,
   nodes.properties,
   nodes.metadata_properties,
   nodes.metadata,
   nodes.created_at,
   nodes.modified_at,
   nodes.deleted_at,
   nodes.created_by,
   nodes.modified_by,
   metatypes.name AS metatype_name,
   metatypes.uuid AS metatype_uuid
FROM (nodes
LEFT JOIN metatypes ON ((metatypes.id = nodes.metatype_id)))
WHERE (nodes.deleted_at IS NULL)
ORDER BY nodes.id, nodes.created_at DESC);
