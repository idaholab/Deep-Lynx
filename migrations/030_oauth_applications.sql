CREATE TABLE oauth_applications (
    id uuid NOT NULL UNIQUE,
    owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
    name text,
    description text,
    redirect_uri text,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL,
    UNIQUE (id,client_id)
);

CREATE TABLE oauth_application_approvals (
    oauth_application_id uuid REFERENCES oauth_applications(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE
)
