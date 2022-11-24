alter table if exists node_files drop constraint node_files_file_id_fkey;
alter table if exists edge_files drop constraint edge_files_file_id_fkey;
alter table if exists data_staging_files drop constraint data_staging_files_file_id_fkey;
alter table if exists report_query_files drop constraint report_query_files_file_id_fkey;

alter table if exists files drop constraint files_pkey;
alter table if exists files add constraint files_compkey primary key (id, created_at);