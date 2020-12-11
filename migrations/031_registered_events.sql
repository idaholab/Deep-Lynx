CREATE TABLE IF NOT EXISTS registered_events (
    id uuid NOT NULL UNIQUE,
    app_name text NOT NULL,
    app_url text NOT NULL,
    data_source_id uuid REFERENCES data_sources(id) ON DELETE CASCADE,
    container_id uuid REFERENCES containers(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) NOT NULL,
    modified_by character varying(255) NOT NULL
);

ALTER TABLE IF EXISTS nodes
DROP COLUMN import_data_id,
ADD COLUMN data_staging_id integer REFERENCES data_staging(id) ON DELETE SET NULL,
ADD COLUMN import_data_id uuid REFERENCES imports(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS edges
DROP COLUMN import_data_id,
ADD COLUMN data_staging_id integer REFERENCES data_staging(id) ON DELETE SET NULL,
ADD COLUMN import_data_id uuid REFERENCES imports(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS queue_tasks (
    id text,
    lock text,
    task text,
    priority numeric,
    added SERIAL
);

CREATE OR REPLACE FUNCTION upsert_queue_tasks(_id text, _lock text, _task text, _priority numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $$                                                                                                                            
    BEGIN                                                                                                                         
        LOOP                                                                                                                      
            -- first try to update the key                                                                                        
            -- note that "id" must be unique                                                                                      
            UPDATE queue_tasks SET lock=_lock, task=_task, priority=_priority WHERE id=_id;                            
            IF found THEN                                                                                                         
                RETURN;                                                                                                           
            END IF;                                                                                                               
            -- not there, so try to insert the key                                                                                
            -- if someone else inserts the same key concurrently,                                                                 
            -- we could get a unique-key failure                                                                                  
            BEGIN                                                                                                                 
                INSERT INTO queue_tasks (id, lock, task, priority) VALUES (_id, _lock, _task, _priority);              
                RETURN;                                                                                                           
            EXCEPTION WHEN unique_violation THEN                                                                                  
                -- do nothing, and loop to try the UPDATE again                                                                   
            END;                                                                                                                  
        END LOOP;                                                                                                                 
    END;                                                                                                                          
$$;

ALTER TABLE IF EXISTS files
DROP CONSTRAINT files_data_source_id_fkey,
ADD CONSTRAINT files_data_source_id_fkey
   FOREIGN KEY (data_source_id)
   REFERENCES data_sources(id)
   ON DELETE SET NULL;