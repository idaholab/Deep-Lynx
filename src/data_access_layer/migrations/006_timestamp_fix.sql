/*
 because CURRENT_TIMESTAMP and NOW() both return the time at the start of a transaction attempting to bulk insert nodes
 or edges with the same original id's failed because the unique constraint of primary_key,created_at was the same - in
 order to combat this we are changing all instances to be clock_timestamp() which will give us the timestamp of the internal
 clock as it is on the moment of insert, not as it was at the start of the transaction
 */
ALTER TABLE nodes ALTER COLUMN created_at SET DEFAULT clock_timestamp();
ALTER TABLE edges ALTER COLUMN created_at SET DEFAULT clock_timestamp();
