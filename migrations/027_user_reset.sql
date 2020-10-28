ALTER TABLE users ADD COLUMN reset_token text;
ALTER TABLE users ADD COLUMN reset_token_issued timestamp;
ALTER TABLE USERS ADD COLUMN email_valid boolean NOT NULL DEFAULT false;
ALTER TABLE USERS ADd COLUMN email_validation_token text;
