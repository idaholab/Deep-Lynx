ALTER TABLE metatypes ADD COLUMN deleted_at timestamp without time zone DEFAULT NULL;
ALTER TABLE metatype_keys ADD COLUMN deleted_at timestamp without time zone DEFAULT NULL;
ALTER TABLE metatype_relationships ADD COLUMN deleted_at timestamp without time zone DEFAULT NULL;
ALTER TABLE metatype_relationship_keys ADD COLUMN deleted_at timestamp without time zone DEFAULT NULL;
ALTER TABLE metatype_relationship_pairs ADD COLUMN deleted_at timestamp without time zone DEFAULT NULL;

CREATE OR REPLACE FUNCTION clone_ontology(userID bigint, baseOntology bigint, targetOntology bigint) RETURNS void AS $$
DECLARE
    createdTime timestamp without time zone;
BEGIN
    UPDATE ontology_versions SET status = 'generating' WHERE id = targetOntology;

    SELECT created_at INTO createdTime FROM ontology_versions WHERE id = targetOntology;

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
           createdTime,
           createdTime,
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
            createdTime,
            createdTime,
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
           createdTime,
           createdTime,
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
            createdTime,
            createdTime,
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
            createdTime,
            createdTime,
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