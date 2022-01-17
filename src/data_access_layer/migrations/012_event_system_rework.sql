/*
   Remove the references first, then drop the whole events table
   events are now sent to the queue directly and their body recorded
   on the event action status for reference
 */
ALTER TABLE event_action_statuses DROP COLUMN event_id CASCADE;
ALTER TABLE event_action_statuses ADD COLUMN event jsonb DEFAULT NULL;
ALTER TABLE data_staging ALTER COLUMN created_at SET DEFAULT clock_timestamp();

DROP TABLE IF EXISTS events;
