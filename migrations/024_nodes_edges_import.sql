ALTER TABLE imports DROP COLUMN errors;
ALTER TABLE imports DROP COLUMN started_at;
ALTER TABLE imports DROP COLUMN stopped_at;

ALTER TABLE imports ADD COLUMN status text DEFAULT 'ready';
ALTER TABLE imports ADD COLUMN status_message text;
