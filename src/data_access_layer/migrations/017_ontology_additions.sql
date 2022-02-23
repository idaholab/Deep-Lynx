/*
 original trigger function had the variable assignment outside the loop, causing null records
 every time
 */
CREATE OR REPLACE FUNCTION ontology_version_insert_trigger() RETURNS TRIGGER AS $$
DECLARE
    version bigint;
BEGIN
    IF NEW.ontology_version IS NULL THEN
        BEGIN
            SELECT ontology_versions.id
            INTO version
            FROM ontology_versions WHERE container_id = NEW.container_id ORDER BY created_at DESC LIMIT 1;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                version = NULL;
        END;

        NEW.ontology_version = version;
    END IF;

    RETURN NEW;
END;
$$ language plpgsql;

ALTER TABLE metatypes ADD COLUMN old_id bigint DEFAULT NULL;
ALTER TABLE metatype_relationships ADD COLUMN old_id bigint DEFAULT NULL;
ALTER TABLE ontology_versions ALTER COLUMN status SET DEFAULT 'ready'::text;


/*
 this function clones the ontology, requires a user, target ontology, and base ontology(but that can be
 NULL if the base ontology is)
 */
CREATE OR REPLACE FUNCTION clone_ontology(userID bigint, baseOntology bigint, targetOntology bigint) RETURNS void AS $$
BEGIN
    UPDATE ontology_versions SET status = 'generating' WHERE id = targetOntology;

    INSERT INTO metatypes(
        container_id,
        name,
        description,
        created_at,
        modified_at,
        created_by,
        modified_by,
        ontology_version,
        old_id)
    SELECT container_id,
           name,
           description,
           NOW(),
           NOW(),
           userID,
           userID,
           targetOntology,
           id
    FROM metatypes WHERE ontology_version = baseOntology;


    INSERT INTO metatype_keys(
        metatype_id,
        name,
        description,
        required,
        property_name,
        data_type,
        options,
        default_value,
        validation,
        created_at,
        modified_at,
        created_by,
        modified_by,
        ontology_version,
        container_id)
    SELECT  metatypes.id,
            k.name,
            k.description,
            k.required,
            k.property_name,
            k.data_type,
            k.options,
            k.default_value,
            k.validation,
            NOW(),
            NOW(),
            userID,
            userID,
            targetOntology,
            k.container_id
    FROM metatype_keys k
             LEFT JOIN metatypes ON metatypes.old_id = k.metatype_id
    WHERE k.ontology_version = baseOntology AND metatypes.ontology_version = targetOntology;

    INSERT INTO metatype_relationships(
        container_id,
        name,
        description,
        created_at,
        modified_at,
        created_by,
        modified_by,
        ontology_version,
        old_id)
    SELECT container_id,
           name,
           description,
           NOW(),
           NOW(),
           userID,
           userID,
           targetOntology,
           id
    FROM metatype_relationships WHERE ontology_version = baseOntology;


    INSERT INTO metatype_relationship_keys(
        metatype_relationship_id,
        name,
        description,
        required,
        property_name,
        data_type,
        options,
        default_value,
        validation,
        created_at,
        modified_at,
        created_by,
        modified_by,
        ontology_version,
        container_id)
    SELECT  metatype_relationships.id,
            k.name,
            k.description,
            k.required,
            k.property_name,
            k.data_type,
            k.options,
            k.default_value,
            k.validation,
            NOW(),
            NOW(),
            userID,
            userID,
            targetOntology,
            k.container_id
    FROM metatype_relationship_keys k
             LEFT JOIN metatype_relationships ON metatype_relationships.old_id = k.metatype_relationship_id
    WHERE k.ontology_version = baseOntology AND metatype_relationships.ontology_version = targetOntology;


    INSERT INTO metatype_relationship_pairs(
        relationship_id,
        origin_metatype_id,
        destination_metatype_id,
        container_id,
        name,
        description,
        relationship_type,
        created_at,
        modified_at,
        created_by,
        modified_by,
        ontology_version)
    SELECT  r.id,
            origin.id,
            destination.id,
            p.container_id,
            p.name,
            p.description,
            p.relationship_type,
            NOW(),
            NOW(),
            userID,
            userID,
            targetOntology
    FROM metatype_relationship_pairs p
             LEFT JOIN metatypes origin ON origin.old_id = p.origin_metatype_id
             LEFT JOIN metatypes destination ON destination.old_id = p.destination_metatype_id
             LEFT JOIN metatype_relationships r ON r.old_id = p.relationship_id
    WHERE p.ontology_version = baseOntology AND origin.ontology_version = targetOntology AND destination.ontology_version = targetOntology AND r.ontology_version = targetOntology;

    UPDATE ontology_versions SET status = 'ready' WHERE id = targetOntology;

    RETURN;
END;
$$ language plpgsql;