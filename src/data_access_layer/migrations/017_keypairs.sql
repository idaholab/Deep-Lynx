CREATE TABLE IF NOT EXISTS keypairs(
    secret text NOT NULL,
    key text NOT NULL,
    user_id uuid NOT NULL
);

CREATE UNIQUE INDEX key ON keypairs(key text_ops);

