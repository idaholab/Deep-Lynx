CREATE TABLE user_container_invites (
    id SERIAL PRIMARY KEY,
    accepted boolean NOT NULL DEFAULT FALSE,
    origin_user uuid REFERENCES users(id) ON DELETE SET NULL,
    email text NOT NULL,
    token text NOT NULL,
    container_id uuid REFERENCES containers(id) ON DELETE CASCADE,
    issued timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
