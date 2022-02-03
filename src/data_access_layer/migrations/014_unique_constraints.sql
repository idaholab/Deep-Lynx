/*
    Forgot that we had unique constraints on the name of the metatypes/relationships - this won't
    work unless we also include the ontology version number in there.
 */
ALTER TABLE metatypes DROP CONSTRAINT metatypes_container_id_name_key;
ALTER TABLE metatype_relationships DROP CONSTRAINT metatype_relationships_container_id_name_key;

ALTER TABLE metatypes ADD CONSTRAINT metatype_container_id_name_version_key UNIQUE (container_id, name, ontology_version);
ALTER TABLE metatype_relationships ADD CONSTRAINT metatype_relationship_container_id_name_version_key UNIQUE (container_id, name, ontology_version);
