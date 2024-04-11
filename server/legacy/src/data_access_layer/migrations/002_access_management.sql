DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
    id bigserial,
    identity_provider_id text,
    identity_provider varchar NOT NULL,
    display_name varchar NOT NULL,
    email varchar NOT NULL,
    active bool NOT NULL DEFAULT false,
    admin bool NOT NULL DEFAULT false,
    created_at date NOT NULL DEFAULT CURRENT_DATE,
    modified_at date NOT NULL DEFAULT CURRENT_DATE,
    created_by varchar NOT NULL,
    modified_by varchar NOT NULL,
    password text,
    reset_token text,
    reset_token_issued timestamp,
    email_valid bool NOT NULL DEFAULT false,
    email_validation_token text,
    PRIMARY KEY(id)
);

DROP TABLE IF EXISTS keypairs;
CREATE TABLE IF NOT EXISTS keypairs (
    user_id bigint REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    key text NOT NULL,
    secret text NOT NULL,
    UNIQUE(key, secret)
);

DROP TABLE IF EXISTS user_container_invites;
CREATE TABLE IF NOT EXISTS user_container_invites (
    id bigserial,
    accepted bool NOT NULL DEFAULT false,
    origin_user bigint REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    email text NOT NULL,
    token text NOT NULL,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE ,
    issued timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

DROP TABLE IF EXISTS oauth_applications;
CREATE TABLE IF NOT EXISTS oauth_applications (
    id uuid NOT NULL,
    owner_id bigint REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name text,
    description text,
    redirect_uri text,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by varchar NOT NULL,
    modified_by varchar NOT NULL,
    PRIMARY KEY(id)
);

DROP TABLE IF EXISTS oauth_application_approvals;
CREATE TABLE IF NOT EXISTS oauth_application_approvals (
    oauth_application_id uuid REFERENCES oauth_applications(id) ON UPDATE CASCADE ON DELETE CASCADE,
    user_id bigint REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE(oauth_application_id, user_id)
);