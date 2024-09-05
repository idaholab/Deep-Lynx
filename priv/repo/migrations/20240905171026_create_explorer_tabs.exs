defmodule Datum.Repo.Migrations.CreateExplorerTabs do
  use Ecto.Migration

  def change do
    create table(:explorer_tabs) do
      add :module, :string
      add :state, :jsonb
      add :user_id, references(:users, on_delete: :delete_all, type: :binary_id)
    end
  end
end
