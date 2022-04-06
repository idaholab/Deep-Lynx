/*
 this migration script assumes you've installed the timescale db extension to the postgres database - it's optional
 whether or not you enable it for your database or not, this script will handle enabling it for you
 */
CREATE EXTENSION IF NOT EXISTS timescaledb;

/* now convert the data_staging table into our first timescaledb table) */
SELECT create_hypertable('data_staging', 'created_at', migrate_data => TRUE);