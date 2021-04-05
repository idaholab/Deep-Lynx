CREATE TABLE "session" (
   "sid" varchar NOT NULL COLLATE "default",
   "sess" jsonb NOT NULL,
   "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "session" ("expire");

CREATE TABLE users(
    id uuid NOT NULL UNIQUE,
    identity_provider_id uuid NOT NULL UNIQUE,
    identity_provider character varying(255) NOT NULL,
    display_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL UNIQUE,
    active boolean NOT NULL DEFAULT false,
    admin boolean NOT NULL DEFAULT false,
    created_at date NOT NULL DEFAULT CURRENT_DATE,
    modified_at date NOT NULL DEFAULT CURRENT_DATE,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);

