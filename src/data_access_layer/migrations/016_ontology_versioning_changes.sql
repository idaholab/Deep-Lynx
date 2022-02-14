ALTER TABLE ontology_versions ADD COLUMN status text DEFAULT 'pending'::text;
ALTER TABLE ontology_versions ADD COLUMN status_message text DEFAULT NULL;
ALTER TABLE ontology_versions ADD COLUMN approved_by character varying(255) DEFAULT NULL;
ALTER TABLE ontology_versions ADD COLUMN approved_at timestamp without time zone DEFAULT NULL;
ALTER TABLE ontology_versions ADD COLUMN published_at timestamp without time zone DEFAULT NULL;
ALTER TABLE ontology_versions DROP COLUMN changelist_id;

DROP TABLE IF EXISTS changelist_approvals;
DROP TABLE IF EXISTS changelists;