CREATE TABLE IF NOT EXISTS edge_queue_items (
    id bigserial,
    edge jsonb NOT NULL,
    import_id bigint REFERENCES imports(id) ON UPDATE CASCADE ON DELETE CASCADE,
    attempts integer DEFAULT 0,
    next_attempt_at timestamp without time zone DEFAULT NOW(),
    error text DEFAULT NULL,
    primary key(id)
);