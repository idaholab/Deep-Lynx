CREATE TABLE node_transformations (
    node_id bigint NOT NULL,
    transformation_id bigint NOT NULL references type_mapping_transformations(id) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY (node_id, transformation_id)
);