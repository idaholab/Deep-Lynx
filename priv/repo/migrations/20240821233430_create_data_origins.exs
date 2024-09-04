defmodule Datum.Repo.Migrations.CreateDataOrigins do
  use Ecto.Migration

  def change do
    create table(:data_origins, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string
      add :owned_by, references(:users, on_delete: :nothing, type: :binary_id)
      add :classifications, {:array, :string}
      add :tags, {:array, :string}
      add :domains, {:array, :string}

      timestamps(type: :utc_datetime)
    end

    create index(:data_origins, [:owned_by])
  end
end
