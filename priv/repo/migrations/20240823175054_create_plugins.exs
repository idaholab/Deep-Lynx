defmodule Datum.Repo.Migrations.CreatePlugins do
  use Ecto.Migration

  def change do
    create table(:plugins) do
      add :name, :string
      add :module_name, :string
      add :enabled, :booelan, default: false
      add :filetypes, {:array, :string}
      add :plugin_type, :string
      add :path, :string
      add :module, :binary

      timestamps(type: :utc_datetime)
    end

    create index(:plugins, [:module_name, :path, :module], unique: true)
  end
end
