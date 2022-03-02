CREATE OR REPLACE FUNCTION new_ontology_version_insert_trigger() RETURNS TRIGGER AS $$
DECLARE
BEGIN
    INSERT INTO ontology_versions(name, container_id, created_at, created_by,status)
    VALUES(NEW.name, NEW.id, NOW(), NEW.created_by, 'published');

    RETURN NEW;
END;
$$ language plpgsql;