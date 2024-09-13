defmodule Datum.DataOrigin.OriginRepo.Migrations.Permissions do
  use Ecto.Migration

  def change do
    create table(:permissions_data) do
      add :data_id, references(:data, on_delete: :delete_all, type: :binary_id)
      add :user_id, :binary_id
      add :group_id, :binary_id
      add :permission_type, :string

      timestamps(type: :utc_datetime)
    end

    create index(:permissions_data, [:data_id])
    create index(:permissions_data, [:user_id])
    create index(:permissions_data, [:group_id])
  end
end
