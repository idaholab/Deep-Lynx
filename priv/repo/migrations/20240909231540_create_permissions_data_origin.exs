defmodule Datum.Repo.Migrations.CreatePermissionsDataOrigin do
  use Ecto.Migration

  def change do
    create table(:permissions_data_origin) do
      add :origin_id, references(:data_origins, on_delete: :nothing)
      add :user_id, references(:users, on_delete: :nothing)
      add :group_id, references(:groups, on_delete: :nothing)
      add :permission_type, :string

      timestamps(type: :utc_datetime)
    end

    create index(:permissions_data_origin, [:origin_id])
    create index(:permissions_data_origin, [:user_id])
    create index(:permissions_data_origin, [:group_id])
  end
end
