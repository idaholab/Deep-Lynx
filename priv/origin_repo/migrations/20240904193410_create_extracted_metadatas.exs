defmodule Datum.DataOrigin.OriginRepo.Migrations.CreateExtractedMetadatas do
  use Ecto.Migration

  def change do
    create table(:extracted_metadatas, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :data, references(:datas, on_delete: :delete_all, type: :binary_id)

      timestamps(type: :utc_datetime)
    end

    create index(:extracted_metadatas, [:data])
  end
end
