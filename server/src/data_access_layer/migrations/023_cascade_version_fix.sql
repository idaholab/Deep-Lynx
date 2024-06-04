ALTER TABLE metatypes DROP CONSTRAINT metatypes_ontology_version_fkey;
ALTER TABLE metatype_keys DROP CONSTRAINT metatype_keys_ontology_version_fkey;
ALTER TABLE metatype_relationships DROP CONSTRAINT metatype_relationships_ontology_version_fkey;
ALTER TABLE metatype_relationship_keys DROP CONSTRAINT metatype_relationship_keys_ontology_version_fkey;
ALTER TABLE metatype_relationship_pairs DROP CONSTRAINT metatype_relationship_pairs_ontology_version_fkey;

ALTER TABLE metatypes ADD CONSTRAINT metatypes_ontology_version_fkey foreign key (ontology_version) references ontology_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE metatype_keys ADD CONSTRAINT metatype_keys_ontology_version_fkey foreign key (ontology_version) references ontology_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE metatype_relationships ADD CONSTRAINT metatype_relationships_ontology_version_fkey foreign key (ontology_version) references ontology_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE metatype_relationship_keys ADD CONSTRAINT metatype_relationship_keys_ontology_version_fkey foreign key (ontology_version) references ontology_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE metatype_relationship_pairs ADD CONSTRAINT metatype_relationship_pairs_ontology_version_fkey foreign key (ontology_version) references ontology_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;

