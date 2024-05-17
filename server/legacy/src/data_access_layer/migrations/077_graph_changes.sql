-- Drop the trigger
DROP TRIGGER IF EXISTS node_insert_trigger ON nodes;
DROP TRIGGER IF EXISTS node_insert_trigger ON default_node_partition;

-- Generate a UUID for any node with a blank original ID so we don't run into any uniqueness issues
UPDATE nodes SET original_data_id = uuid_generate_v4() WHERE original_data_id IS NULL;
UPDATE default_node_partition SET original_data_id = uuid_generate_v4() WHERE original_data_id IS NULL;

ALTER TABLE edges ADD CONSTRAINT edge_unique_constraint_edges UNIQUE(container_id,relationship_pair_id,data_source_id,created_at, origin_id, destination_id);

ALTER TABLE nodes ALTER COLUMN original_data_id SET DEFAULT uuid_generate_v4();
ALTER TABLE default_node_partition ALTER COLUMN original_data_id SET DEFAULT uuid_generate_v4();


