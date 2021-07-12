ALTER TABLE nodes DROP CONSTRAINT "nodes_import_data_id_fkey";
ALTER TABLE nodes ADD CONSTRAINT "nodes_import_data_id_fkey" FOREIGN KEY ("import_data_id") REFERENCES "public"."imports"("id") ON DELETE SET NULL;

ALTER TABLE edges DROP CONSTRAINT "edges_import_data_id_fkey";
ALTER TABLE edges ADD CONSTRAINT "edges_import_data_id_fkey" FOREIGN KEY ("import_data_id") REFERENCES "public"."imports"("id") ON DELETE SET NULL;

ALTER TABLE data_sources ADD COLUMN "archived" bool NOT NULL DEFAULT false;