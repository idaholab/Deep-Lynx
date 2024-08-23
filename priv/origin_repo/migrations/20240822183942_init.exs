defmodule Datum.DataOrigin.OriginRepo.Migrations.Init do
  use Ecto.Migration

  def up do
    create table(:data, primary_key: false) do
      add :id, :binary, primary_key: true
      add :path, {:array, :string}
      add :terminal_path, :string
      add :full_path, :string
      # JSONB column
      add :metadata, :jsonb
      add :owned_by, :binary

      timestamps(type: :utc_datetime)
    end

    create index(:data, [:terminal_path])
  end
end
