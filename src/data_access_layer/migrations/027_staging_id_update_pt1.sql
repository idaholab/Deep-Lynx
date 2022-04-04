/*
    we're splitting the work that needs to be done to prepare data staging to switch into a hypertable for timescale
    because the way we've setup the migration script we could potentially run into a deadlock situation on large dbs
    this allows us to make sure we don't run into issues.

    we need to first generate new uuid's for all the data staging records, then update all foreign key references to point
    to the uuid and to remove the actual foreign key restraint, as we cannot do foreign keys to reference something
    instead a hypertable
*/
CREATE EXTENSION IF NOT EXISTS pgcrypto; /* we must have this in order to generate uuids */
ALTER TABLE data_staging ADD COLUMN new_id uuid DEFAULT gen_random_uuid();

ALTER TABLE nodes ADD COLUMN new_data_staging_id uuid DEFAULT NULL;
ALTER TABLE edges ADD COLUMN new_data_staging_id uuid DEFAULT NULL;
ALTER TABLE data_staging_files ADD COLUMN new_data_staging_id uuid DEFAULT NULL;
