defmodule Datum.Repo.Migrations.CreatePermissionsDataOrigin do
  use Ecto.Migration

  def change do
    create table(:permissions_data_origin) do
      add :data_origin_id, references(:data_origins, on_delete: :delete_all, type: :binary_id)
      add :user_id, references(:users, on_delete: :delete_all, type: :binary_id)
      add :group_id, references(:groups, on_delete: :delete_all, type: :binary_id)
      add :permission_type, :string

      timestamps(type: :utc_datetime)
    end

    create index(:permissions_data_origin, [:data_origin_id])
    create index(:permissions_data_origin, [:user_id])
    create index(:permissions_data_origin, [:group_id])
  end
end
