defmodule Datum.Repo.Migrations.CreateGroups do
  use Ecto.Migration

  def change do
    create table(:groups, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string
      add :owner_id, references(:users, on_delete: :delete_all, type: :binary_id)

      timestamps(type: :utc_datetime)
    end

    create table(:user_groups) do
      add :user_id, references(:users)
      add :group_id, references(:groups)

      timestamps()
    end

    create index(:groups, [:owner_id])
  end
end
