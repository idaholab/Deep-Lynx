-- enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- create BDSIS vector table
DROP TABLE IF EXISTS bdsis_vectors;
CREATE TABLE bdsis_vectors (id bigserial PRIMARY KEY, textual_data text, embedding vector(4096));