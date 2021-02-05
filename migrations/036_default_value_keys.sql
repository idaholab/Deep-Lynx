ALTER TABLE metatype_keys ALTER COLUMN default_value TYPE jsonb USING default_value::jsonb;
ALTER TABLE metatype_relationship_keys ALTER COLUMN default_value TYPE jsonb USING default_value::jsonb;

ALTER TABLE metatype_keys ALTER COLUMN options TYPE jsonb USING to_jsonb(options);
ALTER TABLE metatype_relationship_keys ALTER COLUMN options TYPE jsonb USING to_jsonb(options);
