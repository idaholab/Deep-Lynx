/*
    The following tables are used to drive the ontology versioning system, as well as the container alerts needed
    as part of that system. This also contains the modifications to the ontology tables to add a reference back to
    their version.
 */
DROP TABLE IF EXISTS changelists;
CREATE TABLE IF NOT EXISTS changelists (
    id bigserial,
    name character varying(255) NOT NULL,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    status character varying(255) DEFAULT 'pending'::text,
    changelist jsonb NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) not null,
    modified_by character varying(255) not null,
    applied_at timestamp without time zone DEFAULT NULL,
    PRIMARY KEY(id)
);

DROP TABLE IF EXISTS changelist_approvals;
CREATE TABLE IF NOT EXISTS changelist_approvals (
    changelist_id bigint REFERENCES changelists(id) ON UPDATE CASCADE ON DELETE CASCADE,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    approved_by character varying(255) not null,
    approved_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS ontology_versions;
CREATE TABLE IF NOT EXISTS ontology_versions (
    id bigserial,
    name character varying(255) NOT NULL,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    changelist_id bigint REFERENCES changelists(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) not null,
    PRIMARY KEY(id)
);

DROP TABLE IF EXISTS container_alerts;
CREATE TABLE IF NOT EXISTS container_alerts (
    id bigserial,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    type character varying(255) DEFAULT 'pending'::text,
    message text DEFAULT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) not null,
    acknowledged_at timestamp without time zone DEFAULT NULL,
    acknowledged_by character varying(255) DEFAULT NULL,
    PRIMARY KEY(id)
);

/*
 remove the deleted_at fields, then add in the ontology version fields to the proper field
 */


ALTER TABLE containers DROP COLUMN deleted_at;
ALTER TABLE metatypes DROP COLUMN deleted_at CASCADE ;
ALTER TABLE metatype_keys DROP COLUMN deleted_at;
ALTER TABLE metatype_relationships DROP COLUMN deleted_at CASCADE;
ALTER TABLE metatype_relationship_keys DROP COLUMN deleted_at;
ALTER TABLE metatype_relationship_pairs DROP COLUMN deleted_at;

ALTER TABLE metatypes ADD COLUMN ontology_version bigint references ontology_versions(id) DEFAULT NULL;
ALTER TABLE metatype_keys ADD COLUMN ontology_version bigint references ontology_versions(id) DEFAULT NULL;
ALTER TABLE metatype_relationships ADD COLUMN ontology_version bigint references ontology_versions(id) DEFAULT NULL;
ALTER TABLE metatype_relationship_keys ADD COLUMN ontology_version bigint references ontology_versions(id) DEFAULT NULL;
ALTER TABLE metatype_relationship_pairs ADD COLUMN ontology_version bigint references ontology_versions(id) DEFAULT NULL;

/*
 rebuild the views that were dropped
 */

DROP VIEW IF EXISTS metatypes_view;
DROP VIEW IF EXISTS metatype_relationships_view;

CREATE VIEW metatypes_view AS (
  SELECT DISTINCT metatypes.*, metatypes_inheritance.parent_id AS parent_id
  FROM metatypes_inheritance
           FULL OUTER JOIN metatypes ON metatypes.id = metatypes_inheritance.child_id
);

CREATE VIEW metatype_relationships_view AS (
   SELECT metatype_relationships.*, metatype_relationships_inheritance.parent_id AS parent_id
   FROM metatype_relationships_inheritance
            FULL OUTER JOIN metatype_relationships ON metatype_relationships.id = metatype_relationships_inheritance.child_id
);
