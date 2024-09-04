defmodule Datum.DataOrigin.OriginRepo.Migrations.Tree do
  use Ecto.Migration

  def change do
    create table(:data_tree_paths, primary_key: false) do
      add :ancestor, references(:data, on_delete: :delete_all, type: :binary_id), null: false
      add :descendant, references(:data, on_delete: :delete_all, type: :binary_id), null: false
      add :depth, :int, default: 0
    end

    create(index(:data_tree_paths, [:ancestor, :descendant]))
  end
end
