/*
 data source and related tables
 */
DROP TABLE IF EXISTS data_sources;
CREATE TABLE IF NOT EXISTS data_sources (
    id bigserial,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name text,
    adapter_type text,
    data_format text,
    active bool,
    config jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by varchar NOT NULL,
    modified_by varchar NOT NULL,
    archived bool NOT NULL DEFAULT false,
    status text DEFAULT 'ready'::text,
    status_message text,
    PRIMARY KEY (id)
);

DROP TABLE IF EXISTS imports;
CREATE TABLE IF NOT EXISTS imports (
    id bigserial,
    data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by varchar NOT NULL,
    modified_by varchar NOT NULL,
    reference text,
    status text DEFAULT 'ready'::text,
    status_message text,
    PRIMARY KEY (id)
);

/*
 we cannot make the import_id a foreign key as we consistently lock the import row to indicate when we are attempting
 to process data for that import - but because we still need to potentially insert data into data staging when an
 import is being processed, we cannot have updates/inserts blocked on data staging when an import is being processed
 a good example is a long running data pipeline where the user doesn't want to specify a new import for each piece of data
 like when ingesting logs or large amounts of data.
 */
DROP TABLE IF EXISTS data_staging;
CREATE TABLE IF NOT EXISTS data_staging (
    id bigserial,
    data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE ,
    import_id bigint NOT NULL,
    errors text[],
    data jsonb,
    inserted_at timestamp,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    shape_hash text,
    PRIMARY KEY (id)
);

/*
 type mapping tables
 */
DROP TABLE IF EXISTS type_mappings;
CREATE TABLE type_mappings (
    id bigserial,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE ,
    data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE SET NULl,
    active bool NOT NULL DEFAULT false,
    shape_hash text NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sample_payload jsonb,
    created_by varchar,
    modified_by varchar,
    PRIMARY KEY (id),
    UNIQUE(container_id, data_source_id, shape_hash)
);

DROP TABLE IF EXISTS type_mapping_transformations;
CREATE TABLE IF NOT EXISTS type_mapping_transformations (
    id bigserial,
    type_mapping_id bigint REFERENCES type_mappings(id) ON UPDATE CASCADE ON DELETE CASCADE,
    metatype_id bigint REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    metatype_relationship_pair_id bigint references metatype_relationship_pairs(id) ON UPDATE CASCADE ON DELETE CASCADE,
    conditions jsonb,
    keys jsonb,
    origin_id_key text,
    origin_metatype_id bigint REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    origin_data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE,
    destination_id_key text,
    destination_metatype_id bigint REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    destination_data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE,
    unique_identifier_key text,
    root_array text,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by varchar NOT NULL,
    modified_by varchar NOT NULL,
    archived bool NOT NULL DEFAULT false,
    config jsonb,
    PRIMARY KEY (id)
);

/*
 all tables and operations relating to node and edge insertion
 */
DROP TABLE IF EXISTS nodes;
DROP TABLE IF EXISTS default_node_partition;
CREATE TABLE IF NOT EXISTS nodes (
    id bigserial,
    container_id bigint NOT NULL REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    metatype_id bigint NOT NULL REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
    import_data_id bigint REFERENCES imports(id) ON UPDATE CASCADE ON DELETE SET NULL,
    data_staging_id bigint REFERENCES data_staging(id) ON UPDATE CASCADE ON DELETE SET NULL,
    type_mapping_transformation_id bigint REFERENCES type_mapping_transformations(id) ON UPDATE CASCADE ON DELETE SET NULL,
    original_data_id text,
    properties jsonb NOT NULL,
    metadata jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp DEFAULT NULL,
    created_by varchar,
    modified_by varchar,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS default_node_partition PARTITION OF nodes DEFAULT;

CREATE VIEW current_nodes AS (
    SELECT nodes.*, metatypes.name AS metatype_name
    FROM nodes
    LEFT JOIN metatypes ON metatypes.id = nodes.metatype_id
    WHERE nodes.deleted_at IS NULL
);

CREATE OR REPLACE FUNCTION node_insert_trigger() RETURNS TRIGGER AS $$
DECLARE
    old_id bigint;
BEGIN
    IF NEW.original_data_id IS NOT NULL THEN
        BEGIN
            SELECT nodes.id
            INTO old_id
            FROM nodes
            WHERE original_data_id = NEW.original_data_id
            AND metatype_id = NEW.metatype_id
            AND data_source_id = NEW.data_source_id LIMIT 1;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                old_id := NULL;
        END;

        UPDATE nodes SET deleted_at = CURRENT_TIMESTAMP
        WHERE original_data_id = NEW.original_data_id
        AND  metatype_id = NEW.metatype_id
        AND data_source_id = NEW.data_source_id;

        IF old_id IS NOT NULL THEN
            NEW.id = old_id;
        END IF;
    END IF;

    IF NEW.id IS NOT NULL THEN
        UPDATE nodes SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id::bigint;
    END IF;

    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER node_insert_trigger BEFORE INSERT ON default_node_partition
    FOR EACH ROW EXECUTE PROCEDURE node_insert_trigger();

DROP TABLE IF EXISTS edges;
DROP TABLE IF EXISTS default_edges_partition;
CREATE TABLE edges (
    id bigserial,
    container_id bigint NOT NULL REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    relationship_pair_id bigint NOT NULL REFERENCES metatype_relationship_pairs(id) ON UPDATE CASCADE ON DELETE CASCADE,
    data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
    import_data_id bigint REFERENCES imports(id) ON UPDATE CASCADE ON DELETE SET NULL,
    data_staging_id bigint REFERENCES data_staging(id) ON UPDATE CASCADE ON DELETE SET NULL,
    type_mapping_transformation_id bigint REFERENCES type_mapping_transformations(id) ON UPDATE CASCADE ON DELETE SET NULL,
    origin_id bigint,
    destination_id bigint,
    origin_original_id text,
    origin_data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
    origin_metatype_id bigint REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE SET NULL,
    destination_original_id text,
    destination_data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
    destination_metatype_id bigint REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE SET NULL,
    properties jsonb,
    metadata jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp DEFAULT NULL,
    created_by varchar,
    modified_by varchar,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE(created_at);

CREATE TABLE IF NOT EXISTS default_edge_partition PARTITION OF edges DEFAULT;

CREATE VIEW current_edges AS (
    SELECT edges.*, metatype_relationships.name AS metatype_relationship_name
    FROM edges
      LEFT JOIN metatype_relationship_pairs ON edges.relationship_pair_id = metatype_relationship_pairs.id
      LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id
    WHERE edges.deleted_at IS NULL
);

CREATE OR REPLACE FUNCTION edge_insert_trigger() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    IF NEW.id IS NOT NULL THEN
        UPDATE edges SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id::bigint;
    END IF;

    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER edge_insert_trigger BEFORE INSERT ON default_edge_partition
    FOR EACH ROW EXECUTE PROCEDURE edge_insert_trigger();

/*
 files and related join tables
 */
DROP TABLE IF EXISTS files;
CREATE TABLE files (
    id bigserial,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
    file_name text NOT NULL,
    file_size float8 NOT NULL,
    adapter_file_path text NOT NULL,
    adapter text NOT NULL,
    metadata jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by varchar NOT NULL,
    modified_by varchar NOT NULL,
    md5hash text,
    PRIMARY KEY (id)
);

/*
 note that we can't actually reference the nodes or edges table in the join tables due to the fact they are partitioned
 and have a composite primary key - this should not hopefully cause many issues as a file should stay attached to a node/edge
 until detached manually, and it should technically be attached to all versions of that node/edge
 */
DROP TABLE IF EXISTS node_files;
CREATE TABLE node_files (
    node_id bigint,
    file_id bigint REFERENCES files(id) ON UPDATE CASCADE ON DELETE CASCADE ,
    UNIQUE(node_id, file_id)
);

DROP TABLE IF EXISTS edge_files;
CREATE TABLE edge_files (
    edge_id bigint,
    file_id bigint REFERENCES files(id) ON UPDATE CASCADE ON DELETE CASCADE ,
    UNIQUE(edge_id, file_id)
);

DROP TABLE IF EXISTS data_staging_files;
CREATE TABLE data_staging_files (
    data_staging_id bigint REFERENCES data_staging(id) ON UPDATE CASCADE ON DELETE CASCADE ,
    file_id bigint REFERENCES files(id) ON UPDATE CASCADE ON DELETE CASCADE ,
    UNIQUE(data_staging_id, file_id)
);

/*
 export related tables
 */
DROP TABLE IF EXISTS exports;
CREATE TABLE exports (
    id bigserial,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE ,
    adapter text,
    status text,
    config jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by varchar NOT NULL,
    modified_by varchar NOT NULL,
    status_message text,
    destination_type text,
    PRIMARY KEY (id)
);

DROP TABLE IF EXISTS gremlin_export_edges;
CREATE TABLE gremlin_export_edges (
    id bigserial,
    gremlin_edge_id bigint,
    export_id bigint REFERENCES exports(id) ON UPDATE CASCADE ON DELETE CASCADE,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    relationship_pair_id bigint REFERENCES metatype_relationship_pairs(id) ON UPDATE CASCADE ON DELETE CASCADE,
    origin_id bigint,
    destination_id bigint,
    properties jsonb,
    PRIMARY KEY (id)
);

DROP TABLE IF EXISTS gremlin_export_nodes;
CREATE TABLE public.gremlin_export_nodes (
    id bigserial,
    gremlin_node_id bigint,
    export_id bigint REFERENCES exports(id) ON UPDATE CASCADE ON DELETE CASCADE,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    metatype_id bigint REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    properties jsonb NOT NULL,
    PRIMARY KEY (id)
);