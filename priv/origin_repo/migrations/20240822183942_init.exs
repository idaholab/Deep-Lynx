defmodule Datum.DataOrigin.OriginRepo.Migrations.Init do
  use Ecto.Migration

  def up do
    create table(:data, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :path, {:array, :string}
      add :terminal_path, :string
      add :metadata, :map
      add :owned_by, :binary_id

      timestamps(type: :utc_datetime)
    end

    create index(:data, [:terminal_path])
  end
end
