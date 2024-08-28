defmodule Datum.DataOrigin.OriginRepo.Migrations.Tree do
  use Ecto.Migration

  def change do
    create table(:data_tree_paths, primary_key: false) do
      add :ancestor, :bigint, null: false
      add :descendant, :bigint, null: false
    end

    create(index(:data_tree_paths, [:ancestor, :descendant]))
  end
end
