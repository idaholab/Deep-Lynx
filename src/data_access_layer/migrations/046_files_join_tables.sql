ALTER TABLE files ADD CONSTRAINT file_id_unique UNIQUE(id);

CREATE TABLE node_files (
    node_id uuid REFERENCES nodes(id),
    file_id uuid REFERENCES files(id),
    UNIQUE(node_id, file_id)
);

CREATE TABLE edge_files (
    edge_id uuid REFERENCES edges(id),
    file_id uuid REFERENCES files(id),
    UNIQUE(edge_id, file_id)
);

CREATE TABLE data_staging_files (
    data_staging_id int REFERENCES data_staging(id),
    file_id uuid REFERENCES files(id),
    UNIQUE(data_staging_id, file_id)
);