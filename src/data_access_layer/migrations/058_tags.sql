DROP TABLE IF EXISTS node_tags;
CREATE TABLE IF NOT EXISTS node_tags (
    node_id bigint,
    tag_id bigint REFERENCES tags(id) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE(node_id, tag_id)
);

DROP TABLE IF EXISTS edge_tags;
CREATE TABLE IF NOT EXISTS edge_tags (
    edge_id bigint,
    tag_id bigint REFERENCES tags(id) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE(edge_id, tag_id)
);

DROP TABLE IF EXISTS file_tags;
CREATE TABLE IF NOT EXISTS file_tags (
    file_id bigint,
    tag_id bigint REFERENCES tags(id) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE(file_id, tag_id)
);

DROP TABLE IF EXISTS tags CASCADE;
CREATE TABLE IF NOT EXISTS tags (
    id bigserial,
    tag_name varchar,
    container_id bigint NOT NULL REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    data_source_id bigint NOT NULL REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE,
    metadata jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp DEFAULT NULL,
    created_by varchar,
    modified_by varchar,
    PRIMARY KEY (id, created_at),
    UNIQUE (id),
    UNIQUE (tag_name, container_id, data_source_id)
);