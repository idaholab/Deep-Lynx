CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS buckets (
                                       id SERIAL PRIMARY KEY,
                                       name TEXT NOT NULL,
                                       structure jsonb NOT NULL,
                                       data_table_assignment VARCHAR(255) DEFAULT NULL,
                                       created_by TEXT DEFAULT NULL,
                                       created_at TIMESTAMP DEFAULT NOW(),
                                       modified_by TEXT DEFAULT NULL,
                                       modified_at TIMESTAMP DEFAULT NOW()
);

CREATE SCHEMA IF NOT EXISTS buckets AUTHORIZATION CURRENT_USER;