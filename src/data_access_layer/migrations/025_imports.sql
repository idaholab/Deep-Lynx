DROP TRIGGER IF EXISTS unpack_import on imports;
DROP FUNCTION IF EXISTS unpack_import_row;

ALTER TABLE imports DROP COLUMN data_json;
ALTER TABLE imports DROP COLUMN data_csv;
