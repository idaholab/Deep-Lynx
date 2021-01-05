DROP INDEX original_data_source_nodes;
DROP INDEX original_data_source_edges;

ALTER TABLE nodes DROP COLUMN data_type_mapping_id;
ALTER TABLE edges DROP COLUMN data_type_mapping_id;

ALTER TABLE nodes ADD COLUMN type_mapping_transformation_id uuid REFERENCES data_type_mapping_transformations(id) ON DELETE SET NULL;
ALTER TABLE edges ADD COLUMN type_mapping_transformation_id uuid REFERENCES data_type_mapping_transformations(id) ON DELETE SET NULL;

ALTER TABLE nodes ADD COLUMN composite_original_id text;
ALTER TABLE edges ADD COLUMN composite_original_id text;

CREATE UNIQUE INDEX composite_original_id_nodes ON nodes(data_source_id, composite_original_id);
CREATE UNIQUE INDEX composite_original_id_edges ON edges(data_source_id, composite_original_id);

ALTER TABLE data_type_mapping_transformations DROP COLUMN on_conflict;

