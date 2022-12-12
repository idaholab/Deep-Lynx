CREATE TABLE IF NOT EXISTS new_nodes AS SELECT * FROM nodes;
ALTER TABLE new_nodes ADD CONSTRAINT nnodes_container_id_fkey  FOREIGN KEY (container_id) REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE new_nodes ADD CONSTRAINT nnodes_data_source_id_fkey  FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE new_nodes ADD CONSTRAINT nnodes_import_data_id_fkey FOREIGN KEY (import_data_id) REFERENCES imports(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE new_nodes ADD CONSTRAINT nnodes_metatype_id_fkey FOREIGN KEY (metatype_id) REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE new_nodes ADD CONSTRAINT nnodes_type_mapping_transformation_id_fkey FOREIGN KEY (type_mapping_transformation_id) REFERENCES type_mapping_transformations(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE new_nodes ADD CONSTRAINT nnodes_uniq_id_created_at UNIQUE (id, created_at);

CREATE SEQUENCE new_nodes_id_seq MINVALUE 1;
ALTER TABLE new_nodes ALTER id SET DEFAULT nextval('new_nodes_id_seq');
ALTER SEQUENCE new_nodes_id_seq OWNED BY nodes.id;
SELECT setval('new_nodes_id_seq',  (SELECT MAX(id) FROM nodes));

SELECT create_hypertable('new_nodes', 'created_at', migrate_data => true);

DROP TABLE nodes CASCADE;
ALTER TABLE new_nodes RENAME TO nodes;

CREATE TABLE IF NOT EXISTS new_edges AS SELECT * FROM edges;
ALTER TABLE new_edges ADD CONSTRAINT edges_container_id_fkey FOREIGN KEY (container_id)
    REFERENCES public.containers (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;
ALTER TABLE new_edges ADD CONSTRAINT edges_data_source_id_fkey FOREIGN KEY (data_source_id)
    REFERENCES public.data_sources (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
ALTER TABLE new_edges ADD CONSTRAINT edges_destination_data_source_id_fkey FOREIGN KEY (destination_data_source_id)
    REFERENCES public.data_sources (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
ALTER TABLE new_edges ADD CONSTRAINT edges_destination_metatype_id_fkey FOREIGN KEY (destination_metatype_id)
    REFERENCES public.metatypes (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
ALTER TABLE new_edges ADD CONSTRAINT edges_import_data_id_fkey FOREIGN KEY (import_data_id)
    REFERENCES public.imports (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
ALTER TABLE new_edges ADD CONSTRAINT edges_origin_data_source_id_fkey FOREIGN KEY (origin_data_source_id)
    REFERENCES public.data_sources (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
ALTER TABLE new_edges ADD CONSTRAINT edges_origin_metatype_id_fkey FOREIGN KEY (origin_metatype_id)
    REFERENCES public.metatypes (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
ALTER TABLE new_edges ADD CONSTRAINT edges_relationship_pair_id_fkey FOREIGN KEY (relationship_pair_id)
    REFERENCES public.metatype_relationship_pairs (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;
ALTER TABLE new_edges ADD CONSTRAINT edges_type_mapping_transformation_id_fkey FOREIGN KEY (type_mapping_transformation_id)
    REFERENCES public.type_mapping_transformations (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS new_edges_uniq_idx
    ON new_edges USING btree
        (container_id ASC NULLS LAST, relationship_pair_id ASC NULLS LAST, data_source_id ASC NULLS LAST, created_at ASC NULLS LAST, origin_id ASC NULLS LAST, destination_id ASC NULLS LAST);


CREATE SEQUENCE new_edges_id_seq MINVALUE 1;
ALTER TABLE new_edges ALTER id SET DEFAULT nextval('new_edges_id_seq');
ALTER SEQUENCE new_edges_id_seq OWNED BY edges.id;
SELECT setval('new_edges_id_seq',  (SELECT MAX(id) FROM edges));

SELECT create_hypertable('new_edges', 'created_at', migrate_data => true);

DROP TABLE edges CASCADE;
ALTER TABLE new_edges RENAME TO edges;

DROP SEQUENCE IF EXISTS new_nodes_id_seq;
CREATE SEQUENCE new_nodes_id_seq MINVALUE 1;
ALTER TABLE nodes ALTER id SET DEFAULT nextval('new_nodes_id_seq');
ALTER SEQUENCE new_nodes_id_seq OWNED BY nodes.id;
SELECT setval('new_nodes_id_seq',  (SELECT MAX(id) FROM nodes));

DROP SEQUENCE IF EXISTS new_edges_id_seq;
CREATE SEQUENCE new_edges_id_seq MINVALUE 1;
ALTER TABLE edges ALTER id SET DEFAULT nextval('new_edges_id_seq');
ALTER SEQUENCE new_edges_id_seq OWNED BY edges.id;
SELECT setval('new_edges_id_seq',  (SELECT MAX(id) FROM edges));

CREATE OR REPLACE VIEW current_edges
AS
SELECT DISTINCT ON (edges.origin_id, edges.destination_id, edges.data_source_id, edges.relationship_pair_id) edges.id,
             edges.container_id,
             edges.relationship_pair_id,
             edges.data_source_id,
             edges.import_data_id,
             edges.data_staging_id,
             edges.type_mapping_transformation_id,
             edges.origin_id,
             edges.destination_id,
             edges.origin_original_id,
             edges.origin_data_source_id,
             edges.origin_metatype_id,
             origin.uuid AS origin_metatype_uuid,
             edges.destination_original_id,
             edges.destination_data_source_id,
             edges.destination_metatype_id,
             destination.uuid AS destination_metatype_uuid,
             edges.properties,
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
FROM edges
         LEFT JOIN metatype_relationship_pairs ON edges.relationship_pair_id = metatype_relationship_pairs.id
         LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id
         LEFT JOIN metatypes origin ON edges.origin_metatype_id = origin.id
         LEFT JOIN metatypes destination ON edges.destination_metatype_id = destination.id
WHERE edges.deleted_at IS NULL
ORDER BY edges.origin_id, edges.destination_id, edges.data_source_id, edges.relationship_pair_id, edges.id, edges.created_at DESC;


CREATE OR REPLACE VIEW public.current_nodes
AS
SELECT DISTINCT ON (nodes.id) nodes.id,
                              nodes.container_id,
                              nodes.metatype_id,
                              nodes.data_source_id,
                              nodes.import_data_id,
                              nodes.data_staging_id,
                              nodes.type_mapping_transformation_id,
                              nodes.original_data_id,
                              nodes.properties,
                              nodes.metadata,
                              nodes.created_at,
                              nodes.modified_at,
                              nodes.deleted_at,
                              nodes.created_by,
                              nodes.modified_by,
                              metatypes.name AS metatype_name,
                              metatypes.uuid AS metatype_uuid
FROM nodes
         LEFT JOIN metatypes ON metatypes.id = nodes.metatype_id
WHERE nodes.deleted_at IS NULL
ORDER BY nodes.id, nodes.created_at DESC;

