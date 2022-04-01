-- due to foreign key dependencies, these tables must be dropped and created in this order
DROP TABLE IF EXISTS report_query_files;
DROP TABLE IF EXISTS report_queries;
DROP TABLE IF EXISTS reports;

CREATE TABLE IF NOT EXISTS reports (
	id bigserial,
	container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
	status character varying(255),
	status_message text DEFAULT ''::text,
	notify_users boolean NOT NULL DEFAULT true,
	created_by character varying(255) NOT NULL,
	created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY(id)
);

CREATE TABLE IF NOT EXISTS report_queries (
	id bigserial,
	report_id bigint REFERENCES reports(id) ON UPDATE CASCADE ON DELETE CASCADE,
	query text NOT NULL DEFAULT ''::text,
	status character varying(255),
	status_message text DEFAULT ''::text,
	PRIMARY KEY(id)
);

CREATE TABLE IF NOT EXISTS report_query_files(
	query_id bigint REFERENCES report_queries(id) ON UPDATE CASCADE ON DELETE CASCADE,
	file_id bigint REFERENCES files(id) ON UPDATE CASCADE ON DELETE CASCADE,
	report_id bigint REFERENCES reports(id) ON UPDATE CASCADE ON DELETE CASCADE,
	UNIQUE(query_id, file_id, report_id)
);