ALTER TABLE reports DROP COLUMN IF EXISTS notify_users CASCADE;

-- add created_at, created_by, and result_file_id to the query
ALTER TABLE report_queries 
    ADD COLUMN IF NOT EXISTS created_by character varying(255),
    ADD COLUMN IF NOT EXISTS created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS result_file_id bigint,
	ADD COLUMN IF NOT EXISTS result_file_created_at timestamp without time zone;

-- report_query_files realistically only needs query ID and file ID to function, since query has an FK to report
ALTER TABLE report_query_files 
    DROP CONSTRAINT IF EXISTS report_query_files_query_id_file_id_report_id_key,
    DROP COLUMN IF EXISTS report_id,
	ADD COLUMN IF NOT EXISTS file_created_at timestamp without time zone,
	DROP CONSTRAINT IF EXISTS report_query_files_query_id_file_id_file_created_at_key,
    ADD CONSTRAINT report_query_files_query_id_file_id_file_created_at_key
		UNIQUE (query_id, file_id, file_created_at),
	DROP CONSTRAINT IF EXISTS report_query_files_file_id_file_created_at_fkey,
	ADD CONSTRAINT report_query_files_file_id_file_created_at_fkey
		FOREIGN KEY (file_id, file_created_at)
		REFERENCES files (id, created_at)
		ON UPDATE CASCADE ON DELETE CASCADE;