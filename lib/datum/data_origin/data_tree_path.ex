defmodule Datum.DataOrigin.DataTreePath do
  @moduledoc """
  DataTreePath is for use with the closure_tables library. It's needed to hold
  the relationship information for us modeling a filesystem
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  schema "data_tree_paths" do
    belongs_to :parent_data, Datum.DataOrigin.Data, foreign_key: :ancestor, type: :binary_id
    belongs_to :data, Datum.DataOrigin.Data, foreign_key: :descendant, type: :binary_id
    field :depth, :integer, default: 0
  end

  @doc false
  def changeset(origin, attrs) do
    origin
    |> cast(attrs, [:parent_data, :data, :depth])
  end
end
