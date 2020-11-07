CREATE TABLE oauth_applications (
    id uuid NOT NULL,
    owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
    name text,
    description text,
    redirect_uri text,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);

CREATE UNIQUE INDEX client_id ON oauth_applications(client_id text_ops);
