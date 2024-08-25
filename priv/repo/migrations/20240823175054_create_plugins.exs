defmodule Datum.Repo.Migrations.CreatePlugins do
  use Ecto.Migration

  def change do
    create table(:plugins) do
      add :name, :string
      add :filetypes, {:array, :string}
      add :plugin_type, :string
      add :path, :string
      add :module, :binary

      timestamps(type: :utc_datetime)
    end
  end
end
