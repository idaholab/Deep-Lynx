ALTER TABLE IF EXISTS files DROP CONSTRAINT files_md5hash_uniq;
ALTER TABLE IF EXISTS files ADD CONSTRAINT files_md5hash_uniq UNIQUE (md5hash);
ALTER TABLE IF EXISTS tags ADD CONSTRAINT tags_tag_name_uniq UNIQUE (tag_name);