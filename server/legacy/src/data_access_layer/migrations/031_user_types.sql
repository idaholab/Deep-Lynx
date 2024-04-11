ALTER TABLE users ADD COLUMN type varchar(255) DEFAULT 'user';

CREATE TABLE IF NOT EXISTS container_service_users (
    user_id bigint NOT NULL references users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    container_id bigint NOT NULL references containers(id) ON UPDATE CASCADE ON DELETE CASCADE
);