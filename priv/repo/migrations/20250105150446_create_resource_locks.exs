defmodule Datum.Repo.Migrations.CreateResourceLocks do
  use Ecto.Migration

  def change do
    create table(:resource_locks, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :resource_id, :binary_id
      add :resource_type, :string

      add :expires_at, :utc_datetime,
        default:
          fragment(~s"""
          (datetime('now', '+5 minutes'))
          """)

      add :locked_by, references(:users, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:resource_locks, [:locked_by, :resource_id, :id])
  end
end
