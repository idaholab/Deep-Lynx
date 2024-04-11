CREATE TRIGGER node_insert_trigger BEFORE INSERT ON nodes
    FOR EACH ROW EXECUTE PROCEDURE node_insert_trigger();