DROP TABLE IF EXISTS containers;
CREATE TABLE IF NOT EXISTS containers (
    id bigserial,
    name character varying(255) not null,
    description text default ''::text,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone  DEFAULT NULL,
    created_by character varying(255) not null,
    modified_by character varying(255) not null,
    config jsonb default '{}'::jsonb,
    primary key(id),
    unique(name, created_by)
);

DROP TABLE IF EXISTS metatypes;
CREATE TABLE IF NOT EXISTS metatypes (
    id bigserial,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name character varying(256) NOT NULL,
    description text NOT NULL DEFAULT ''::text,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone  DEFAULT NULL,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL,
    PRIMARY KEY(id),
    UNIQUE (container_id, name)
);

DROP TABLE IF EXISTS metatypes_inheritance;
CREATE TABLE IF NOT EXISTS metatypes_inheritance (
    parent_id bigint REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    child_id bigint REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (parent_id, child_id),
    UNIQUE(child_id)
);

/*
 metatypes_view allows us to quickly fetch the metatype's parent id if it exists
 without having to run a manual join on the inheritance table, this is used frequently
 */
CREATE VIEW metatypes_view AS (
  SELECT DISTINCT metatypes.*, metatypes_inheritance.parent_id AS parent_id
  FROM metatypes_inheritance
           FULL OUTER JOIN metatypes ON metatypes.id = metatypes_inheritance.child_id
   WHERE deleted_at IS NULL
      );

/*
 this trigger insures that we cannot enter invalid relationships into the inheritance
 table, mainly so that a metatype can't claim one of the parents in its inheritance chain
 as its child
 */
CREATE OR REPLACE FUNCTION check_metatype_inheritance() RETURNS TRIGGER AS $$
DECLARE
    metatype metatypes_view;
    parent_metatype metatypes_view;
BEGIN
    FOR metatype IN (SELECT * FROM metatypes_view WHERE id = NEW.parent_id) LOOP
            FOR parent_metatype IN ( WITH RECURSIVE parents AS (
                SELECT * FROM metatypes_view
                WHERE id = metatype.parent_id
                UNION
                SELECT v.* from metatypes_view v INNER JOIN parents p ON p.parent_id = v.id
            ) SELECT * FROM parents) LOOP

                    IF parent_metatype.id = NEW.child_id THEN
                        RAISE EXCEPTION 'proposed child is in proposed parents inheritance chain';
                    END IF;

                END LOOP;
        END LOOP;
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER check_metatype_inheritance BEFORE INSERT OR UPDATE ON metatypes_inheritance
    FOR EACH ROW EXECUTE FUNCTION check_metatype_inheritance();


DROP TABLE IF EXISTS metatype_keys;
CREATE TABLE IF NOT EXISTS metatype_keys (
    id bigserial,
    metatype_id bigint REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name character varying(255) NOT NULL,
    description text NOT NULL DEFAULT ''::text,
    required boolean NOT NULL DEFAULT false,
    property_name character varying(255)  NOT NULL,
    data_type character varying(255) NOT NULL,
    options jsonb,
    default_value jsonb,
    validation jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone  DEFAULT NULL,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL,
    PRIMARY KEY(id),
    UNIQUE(metatype_id, property_name)
);

/*
 get_metatype_keys runs an iterative query to build all the keys which the passed metatype
 inherit based on its parent
 */
CREATE OR REPLACE FUNCTION get_metatype_keys(arg_metatype_id bigint) RETURNS setof metatype_keys
AS $$
WITH RECURSIVE parents AS (
    SELECT * FROM metatypes_view
    WHERE id = arg_metatype_id
    UNION
    SELECT v.* from metatypes_view v INNER JOIN parents p ON p.parent_id = v.id
) SELECT metatype_keys.* FROM parents p INNER JOIN metatype_keys ON metatype_keys.metatype_id = p.id;
$$ LANGUAGE sql;

/*
 the check_metatype_key trigger insures that no record can be created or updated when the property name
 matches that of an inherited key, as property names are unique per metatype.
 */
CREATE OR REPLACE FUNCTION check_metatype_key() RETURNS TRIGGER AS $check_metatype_key$
DECLARE
    matched metatype_keys;
BEGIN
    IF NEW.metatype_id IS NULL THEN
        RAISE EXCEPTION 'metatype_id cannot be null';
    END IF;


    FOR matched IN (SELECT * FROM get_metatype_keys(NEW.metatype_id) WHERE property_name = NEW.property_name) LOOP
            IF matched.metatype_id <> NEW.metatype_id THEN
                RAISE EXCEPTION 'cannot add key, inherited key shares property_name';
            END IF;
        END LOOP;

    RETURN NEW;
END;
$check_metatype_key$ LANGUAGE plpgsql;

CREATE TRIGGER check_metatype_key BEFORE INSERT OR UPDATE ON metatype_keys
    FOR EACH ROW EXECUTE PROCEDURE check_metatype_key();

DROP TABLE IF EXISTS metatype_relationships;
CREATE TABLE IF NOT EXISTS metatype_relationships
(
    id bigserial,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name character varying(255) NOT NULL,
    description text NOT NULL DEFAULT ''::text,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone  DEFAULT NULL,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL,
    PRIMARY KEY(id),
    UNIQUE(container_id, name)
);

DROP TABLE IF EXISTS metatype_relationships_inheritance;
CREATE TABLE IF NOT EXISTS metatype_relationships_inheritance (
    parent_id bigint REFERENCES metatype_relationships(id) ON UPDATE CASCADE ON DELETE CASCADE,
    child_id bigint REFERENCES metatype_relationships(id) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (parent_id, child_id),
    UNIQUE(child_id)
);

/*
 metatype_relationships_view allows us to quickly fetch the relationship's parent id if it exists
 without having to run a manual join on the inheritance table, this is used frequently
 */
CREATE VIEW metatype_relationships_view AS (
    SELECT metatype_relationships.*, metatype_relationships_inheritance.parent_id AS parent_id
    FROM metatype_relationships_inheritance
        FULL OUTER JOIN metatype_relationships ON metatype_relationships.id = metatype_relationships_inheritance.child_id
    WHERE deleted_at IS NULL
);

/*
 this trigger insures that we cannot enter invalid relationships into the inheritance
 table, mainly so that a relationship can't claim one of the parents in its inheritance chain
 as its child
 */
CREATE OR REPLACE FUNCTION check_metatype_relationship_inheritance() RETURNS TRIGGER AS $$
DECLARE
    relationship metatype_relationships_view;
    parent_relationship metatype_relationships_view;
BEGIN
    FOR relationship IN (SELECT * FROM metatype_relationships_view WHERE id = NEW.parent_id) LOOP
            FOR parent_relationship IN ( WITH RECURSIVE parents AS (
                SELECT * FROM metatype_relationships_view
                WHERE id = relationship.parent_id
                UNION
                SELECT v.* from metatype_relationships_view v INNER JOIN parents p ON p.parent_id = v.id
            ) SELECT * FROM parents) LOOP

                    IF parent_relationship.id = NEW.child_id THEN
                        RAISE EXCEPTION 'proposed child is in proposed parents inheritance chain';
                    END IF;

                END LOOP;
        END LOOP;
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER check_metatype_relationship_inheritance BEFORE INSERT OR UPDATE ON metatype_relationships_inheritance
    FOR EACH ROW EXECUTE FUNCTION check_metatype_relationship_inheritance();


DROP TABLE IF EXISTS metatype_relationship_keys;
CREATE TABLE IF NOT EXISTS metatype_relationship_keys(
    id bigserial,
    metatype_relationship_id bigint REFERENCES metatype_relationships(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name character varying(255) NOT NULL,
    description text NOT NULL DEFAULT ''::text,
    required boolean NOT NULL DEFAULT false,
    property_name character varying(255)  NOT NULL,
    data_type character varying(255) NOT NULL,
    options jsonb,
    default_value jsonb,
    validation jsonb,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone  DEFAULT NULL,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL,
    PRIMARY KEY(id),
    UNIQUE(metatype_relationship_id, property_name)
);

/*
 get_metatype_relationship_keys runs an iterative query to build all the keys which the passed relationship
 inherit based on its parent
 */
CREATE OR REPLACE FUNCTION get_metatype_relationship_keys(relationship_id bigint) RETURNS setof metatype_relationship_keys
AS $$
WITH RECURSIVE parents AS (
    SELECT * FROM metatype_relationships_view
    WHERE id = relationship_id
    UNION
    SELECT v.* from metatype_relationships_view v INNER JOIN parents p ON p.parent_id = v.id
) SELECT metatype_relationship_keys.* FROM parents p INNER JOIN metatype_relationship_keys ON metatype_relationship_keys.metatype_relationship_id = p.id;
$$ LANGUAGE sql;

/*
 the check_metatype_key trigger insures that no record can be created or updated when the property name
 matches that of an inherited key, as property names are unique per metatype.
 */
CREATE OR REPLACE FUNCTION check_metatype_relationship_key() RETURNS TRIGGER AS $check_metatype_relationship_key$
DECLARE
    matched metatype_relationship_keys;
BEGIN
    IF NEW.metatype_relationship_id IS NULL THEN
        RAISE EXCEPTION 'metatype_relationship_id cannot be null';
    END IF;


    FOR matched IN (SELECT * FROM get_metatype_relationship_keys(NEW.metatype_relationship_id) WHERE property_name = NEW.property_name) LOOP
            IF matched.metatype_relationship_id <> NEW.metatype_relationship_id THEN
                RAISE EXCEPTION 'cannot add key, inherited key shares property_name';
            END IF;
        END LOOP;

    RETURN NEW;
END;
$check_metatype_relationship_key$ LANGUAGE plpgsql;

CREATE TRIGGER check_metatype_relationship_key BEFORE INSERT OR UPDATE ON metatype_relationship_keys
    FOR EACH ROW EXECUTE PROCEDURE check_metatype_relationship_key();

DROP TABLE IF EXISTS metatype_relationship_pairs;
CREATE TABLE IF NOT EXISTS metatype_relationship_pairs
(
    id bigserial,
    relationship_id bigint REFERENCES metatype_relationships(id) ON UPDATE CASCADE ON DELETE CASCADE,
    origin_metatype_id bigint REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    destination_metatype_id bigint REFERENCES metatypes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    container_id bigint REFERENCES containers(id) ON UPDATE CASCADE ON DELETE CASCADE,
    name character varying(255) NOT NULL,
    description text NOT NULL DEFAULT ''::text,
    relationship_type character varying(255) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone  DEFAULT NULL,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL,
    PRIMARY KEY(id),
    UNIQUE(relationship_id, origin_metatype_id, destination_metatype_id)
);

/*
 the next two functions are used to fetch all relationship pairs a metatype might have inherited, and separate them by
 either origin or destination id - you need the separation here so that you can tell which metatype this was inherited
 from
 */
CREATE OR REPLACE FUNCTION get_relationship_pairs_by_origin(arg_metatype_id bigint) RETURNS setof metatype_relationship_pairs
AS $$
WITH RECURSIVE parents AS (
    SELECT * FROM metatypes_view
    WHERE id = arg_metatype_id
    UNION
    SELECT v.* from metatypes_view v INNER JOIN parents p ON p.parent_id = v.id
) SELECT pairs.* FROM parents p INNER JOIN metatype_relationship_pairs pairs ON pairs.origin_metatype_id = p.id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_relationship_pairs_by_destination(arg_metatype_id bigint) RETURNS setof metatype_relationship_pairs
AS $$
WITH RECURSIVE parents AS (
    SELECT * FROM metatypes_view
    WHERE id = arg_metatype_id
    UNION
    SELECT v.* from metatypes_view v INNER JOIN parents p ON p.parent_id = v.id
) SELECT pairs.* FROM parents p INNER JOIN metatype_relationship_pairs pairs ON pairs.destination_metatype_id = p.id;
$$ LANGUAGE sql;