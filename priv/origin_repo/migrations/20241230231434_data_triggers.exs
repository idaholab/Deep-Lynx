defmodule Datum.DataOrigin.OriginRepo.Migrations.DataTriggers do
  use Ecto.Migration

  def up do
    create table(:data_history, primary_key: false) do
      add :id, :binary, primary_key: true
      add :in_compliance, :boolean, default: false
      add :path, :string
      add :original_path, :string
      add :type, :string
      add :checksum_type, :string
      add :checksum, :string
      add :file_type, :string
      add :properties, :jsonb
      add :description, :string
      add :natural_language_properties, :string
      add :owned_by, :binary
      add :origin_id, :binary

      add :tags, {:array, :string}
      add :domains, {:array, :string}

      add :incoming_relationships, {:array, :map}
      add :outgoing_relationships, {:array, :map}

      add :inserted_at, :utc_datetime, primary_key: true
      add :updated_at, :utc_datetime, default: nil, primary_key: true
      add :deleted_at, :utc_datetime, default: nil, primary_key: true
    end

    # with the data history table created, let's make the triggers that will populate it
    execute "CREATE TRIGGER d1_data_history_insert AFTER INSERT ON data BEGIN
      INSERT INTO data_history(id,in_compliance,path,original_path,type,checksum_type,checksum,file_type,properties,description,natural_language_properties,owned_by,origin_id,tags,domains,incoming_relationships,outgoing_relationships,inserted_at,updated_at)
      VALUES (NEW.id,NEW.in_compliance,NEW.path,NEW.original_path,NEW.type,NEW.checksum_type,NEW.checksum,NEW.file_type,NEW.properties,NEW.description,NEW.natural_language_properties,NEW.owned_by,NEW.origin_id,NEW.tags,NEW.domains,NEW.incoming_relationships,NEW.outgoing_relationships,NEW.inserted_at,NEW.updated_at);
      END;"

    execute "CREATE TRIGGER d1_data_history_update AFTER UPDATE ON data BEGIN
      INSERT INTO data_history(id,in_compliance,path,original_path,type,checksum_type,checksum,file_type,properties,description,natural_language_properties,owned_by,origin_id,tags,domains,incoming_relationships,outgoing_relationships,inserted_at,updated_at)
      VALUES (NEW.id,NEW.in_compliance,NEW.path,NEW.original_path,NEW.type,NEW.checksum_type,NEW.checksum,NEW.file_type,NEW.properties,NEW.description,NEW.natural_language_properties,NEW.owned_by,NEW.origin_id,NEW.tags,NEW.domains,NEW.incoming_relationships,NEW.outgoing_relationships,NEW.inserted_at,NEW.updated_at);
      END;"

    execute "CREATE TRIGGER d1_data_history_delete AFTER DELETE ON data BEGIN
      INSERT INTO data_history(id,in_compliance,path,original_path,type,checksum_type,checksum,file_type,properties,description,natural_language_properties,owned_by,origin_id,tags,domains,incoming_relationships,outgoing_relationships,inserted_at,updated_at,deleted_at)
      VALUES (OLD.id,OLD.in_compliance,OLD.path,OLD.original_path,OLD.type,OLD.checksum_type,OLD.checksum,OLD.file_type,OLD.properties,OLD.description,OLD.natural_language_properties,OLD.owned_by,OLD.origin_id,OLD.tags,OLD.domains,OLD.incoming_relationships,OLD.outgoing_relationships,OLD.inserted_at,OLD.updated_at,NOW());
      END;"
  end
end
