defmodule Datum.DataOrigin.OriginRepo.Migrations.Init do
  use Ecto.Migration

  def up do
    create table(:data, primary_key: false) do
      add :id, :binary, primary_key: true
      add :path, :string
      add :original_path, :string
      add :type, :string
      add :file_type, :string
      add :properties, :jsonb
      add :owned_by, :binary

      add :tags, {:array, :string}
      add :domains, {:array, :string}

      timestamps(type: :utc_datetime)
    end

    create index(:data, [:path])
  end
end
