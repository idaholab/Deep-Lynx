CREATE TABLE node_transformations (
    node_id bigint NOT NULL,
    transformation_id bigint NOT NULL references type_mapping_transformations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY (node_id, transformation_id)
);

ALTER TABLE type_mapping_transformations ALTER COLUMN tab_node_id TYPE text;
ALTER TABLE type_mapping_transformations ADD COLUMN name text DEFAULT NULL;