defmodule Datum.DataOrigin.OriginRepo.Migrations.Init do
  use Ecto.Migration

  def up do
    create table(:data, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :path, {:array, :string}
      add :terminal_path, :string
      # JSONB column
      add :metadata, :binary
      add :owned_by, :binary_id

      timestamps(type: :utc_datetime)
    end

    create index(:data, [:terminal_path])
  end
end
