DO
$do$
DECLARE
  _db TEXT := 'deep_lynx';
  _user TEXT := 'postgres';
  _password TEXT := 'deeplynxcore';
  _connectionString TEXT := 'user=' || _user || ' password=' || _password || ' dbname=' || current_database();
BEGIN
  CREATE EXTENSION IF NOT EXISTS dblink; -- enable extension 
  IF EXISTS (SELECT 1 FROM pg_database WHERE datname = _db) THEN
    RAISE NOTICE 'Database already exists';
  ELSE
  	RAISE NOTICE '%', _connectionString;
    PERFORM dblink_connect(_connectionString);
    PERFORM dblink_exec('CREATE DATABASE ' || _db);
  END IF;
END
$do$
