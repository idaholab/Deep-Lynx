-- adding a timeseries boolean to files to indicate timeseries uploads for the timeseries rust module
ALTER TABLE files ADD COLUMN IF NOT EXISTS timeseries boolean DEFAULT FALSE;

-- table for tracking DESCRIBE results for a given file version
DROP TABLE IF EXISTS file_descriptions;
CREATE TABLE IF NOT EXISTS file_descriptions (
	id bigserial,
	description jsonb,
	file_id bigint NOT NULL,
	file_created_at timestamp NOT NULL,
	described_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id, described_at),
	CONSTRAINT file_descriptions_files_fkey 
		FOREIGN KEY (file_id, file_created_at) 
		REFERENCES files (id, created_at)
		ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT unique_file_id_created_at UNIQUE (file_id, file_created_at)
);