defmodule Datum.DataOrigin.OriginRepo.Migrations.SearchTables do
  use Ecto.Migration

  def change do
    execute "CREATE VIRTUAL TABLE data_search USING fts5(id,path,original_path,description,file_type,natural_language_properties,properties,tags,domains, tokenize='porter unicode61', content='data', content_rowid='rowid');"

    # the triggers for creating the indices while we add/update/delete data
    execute "CREATE TRIGGER t1_ai_data_search AFTER INSERT ON data BEGIN
    INSERT INTO data_search(rowid,id,path,original_path,description,file_type,natural_language_properties,properties,tags,domains) VALUES (new.rowid,new.id,new.path,new.original_path,new.description,new.file_type,new.natural_language_properties,new.properties,new.tags,new.domains);
  END;"
      execute "CREATE TRIGGER t1_ad_data_search AFTER DELETE ON data BEGIN
    INSERT INTO data_search(data_search,rowid,id,path,original_path,description,file_type,natural_language_properties,properties,tags,domain) VALUES('delete', old.rowid,old.id,old.path,old.original_path,old.description,old.file_type,old.natural_language_properties,old.properties,old.tags,old.domains);
  END;"
      execute "CREATE TRIGGER t1_au_data_search AFTER UPDATE ON data BEGIN
    INSERT INTO data_search(data_search,rowid,id,path,original_path,description,file_type,natural_language_properties,properties,tags,domains) VALUES('delete', old.rowid,old.id,old.path,old.description,old.file_type,old.natural_language_properties,old.properties,old.tags,old.domains);
    INSERT INTO data_search(rowid,id,path,original_path,description,file_type,natural_language_properties,tags,domains) VALUES (new.rowid,new.id,new.path,new.description,new.file_type,new.natural_language_properties,new.properties,new.tags,new.domains);
  END;"
  end
end
