DROP TABLE IF EXISTS queue;
CREATE TABLE IF NOT EXISTS queue (
    id bigserial,
    /* we use clock_timestamp() so if we insert on a transaction we get the db time, not transaction start time */
    created_at timestamp without time zone NOT NULL DEFAULT clock_timestamp(),
    queue_name character varying(255) not null,
    processed_at timestamp without time zone DEFAULT NULL,
    data jsonb NOT NULL,
    primary key (id)
);
