/*
 event system specific tables
 */
DROP TABLE IF EXISTS registered_events;
CREATE TABLE registered_events (
    id bigserial,
    app_name text NOT NULL,
    app_url text NOT NULL,
    data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    event_type text NOT NULL,
    active bool NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by varchar NOT NULL,
    modified_by varchar NOT NULL,
    PRIMARY KEY (id)
);

DROP TABLE IF EXISTS queue_tasks;
CREATE TABLE IF NOT EXISTS queue_tasks (
    id text,
    lock text,
    task text,
    priority numeric,
    added SERIAL
);

/*
 needed function for handling duplicate or existing events
 */
CREATE OR REPLACE FUNCTION upsert_queue_tasks(_id text, _lock text, _task text, _priority numeric)
    RETURNS void
    LANGUAGE plpgsql
AS $function$
BEGIN
    LOOP
        -- first try to update the key
        -- note that "id" must be unique
        UPDATE queue_tasks SET lock=_lock, task=_task, priority=_priority WHERE id=_id;
        IF found THEN
            RETURN;
        END IF;
        -- not there, so try to insert the key
        -- if someone else inserts the same key concurrently,
        -- we could get a unique-key failure
        BEGIN
            INSERT INTO queue_tasks (id, lock, task, priority) VALUES (_id, _lock, _task, _priority);
            RETURN;
        EXCEPTION WHEN unique_violation THEN
        -- do nothing, and loop to try the UPDATE again
        END;
    END LOOP;
END;
$function$
