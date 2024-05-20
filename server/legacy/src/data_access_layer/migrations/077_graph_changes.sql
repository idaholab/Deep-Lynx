-- Drop the trigger
DROP TRIGGER IF EXISTS node_insert_trigger ON nodes;
DROP TRIGGER IF EXISTS node_insert_trigger ON default_node_partition;

-- Generate a UUID for any node with a blank original ID so we don't run into any uniqueness issues
UPDATE nodes SET original_data_id = uuid_generate_v4() WHERE original_data_id IS NULL;
UPDATE default_node_partition SET original_data_id = uuid_generate_v4() WHERE original_data_id IS NULL;

-- Set the primary key as a composite key (original_data_id, container, data_source_id, created_at)
-- First though, remove all the duplicates that violate the new constraint
DELETE FROM nodes WHERE nodes.id IN(
    SELECT sub.id
    FROM
        (
            SELECT id,original_data_id, container_id, data_source_id, created_at,
                   ROW_NUMBER() OVER (PARTITION BY original_data_id, container_id, data_source_id, created_at ORDER BY created_at ASC) AS num
            FROM nodes
        ) as sub
    WHERE num > 1);

ALTER TABLE nodes ADD CONSTRAINT node_unique_constraint_nodes UNIQUE(original_data_id, container_id, data_source_id, created_at);
ALTER TABLE default_node_partition ADD CONSTRAINT default_node_partition_unique_constraint_nodes UNIQUE(original_data_id, container_id, data_source_id, created_at);

DELETE FROM edges WHERE edges.id IN(
    SELECT sub.id
    FROM
        (
            SELECT id,container_id,relationship_pair_id,data_source_id,created_at, origin_original_id, destination_original_id,
                   ROW_NUMBER() OVER (PARTITION BY container_id,relationship_pair_id,data_source_id,created_at, origin_original_id, destination_original_id ORDER BY created_at ASC) AS num
            FROM edges
        ) as sub
    WHERE num > 1);

ALTER TABLE edges ADD CONSTRAINT edge_unique_constraint_edges_new UNIQUE(container_id,relationship_pair_id,data_source_id,created_at, origin_original_id, destination_original_id);
ALTER TABLE default_edge_partition ADD CONSTRAINT default_node_partition_unique_constraint_edges_new UNIQUE(container_id,relationship_pair_id,data_source_id,created_at, origin_original_id, destination_original_id);

ALTER TABLE nodes ALTER COLUMN original_data_id SET DEFAULT uuid_generate_v4();
ALTER TABLE default_node_partition ALTER COLUMN original_data_id SET DEFAULT uuid_generate_v4();


