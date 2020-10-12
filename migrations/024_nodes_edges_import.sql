ALTER TABLE imports DROP COLUMN errors;
ALTER TABLE imports DROP COLUMN started_at;
ALTER TABLE imports DROP COLUMN stopped_at;

ALTER TABLE imports ADD COLUMN status text DEFAULT 'ready';
ALTER TABLE imports ADD COLUMN status_message text;

ALTER TABLE nodes ADD COLUMN import_data_id integer REFERENCES data_staging(id) ON DELETE SET NULL;
ALTER TABLE edges ADD COLUMN import_data_id integer REFERENCES data_staging(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS unpack_import on imports;
DROP FUNCTION IF EXISTS unpack_import_row;

ALTER TABLE imports DROP COLUMN data_json;
ALTER TABLE imports DROP COLUMN data_csv;
