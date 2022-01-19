/*
 remove old event system
*/
DROP TABLE IF EXISTS queue_tasks;

DROP TABLE IF EXISTS registered_events;

DROP FUNCTION IF EXISTS upsert_queue_tasks;

/*
 event system specific tables
 */
DROP TABLE IF EXISTS events;
CREATE TABLE events (
    id uuid NOT NULL,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE,
    event_type text NOT NULL,
    event_config jsonb,
    event jsonb NOT NULL,
    processed timestamp without time zone DEFAULT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    PRIMARY KEY (id)
);

DROP TABLE IF EXISTS event_actions;
CREATE TABLE event_actions (
    id bigserial,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE,
    event_type text NOT NULL,
    action_type text NOT NULL,
    action_config jsonb,
    destination text,
    destination_data_source_id bigint REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE CASCADE DEFAULT NULL,
    active bool NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone DEFAULT NULL,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE(container_id, data_source_id, event_type, destination_data_source_id, destination)
);

DROP TABLE IF EXISTS event_action_statuses;
CREATE TABLE event_action_statuses (
    id bigserial,
    event_id uuid REFERENCES events(id) ON UPDATE CASCADE ON DELETE CASCADE,
    event_action_id bigint REFERENCES event_actions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'sent'::text,
    status_message text,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone,
    modified_by character varying(255),
    PRIMARY KEY (id)
);
