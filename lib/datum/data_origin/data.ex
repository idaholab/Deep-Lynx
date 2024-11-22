defmodule Datum.DataOrigin.Data do
  @moduledoc """
  Data is the actual stored data for an origin, typically represents a file or directory.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "data" do
    field :row_num, :integer, virtual: true
    field :path, :string
    field :original_path, :string
    field :type, Ecto.Enum, values: [:directory, :file, :root_directory, :organization, :person]
    field :file_type, :string, default: nil
    field :description, :string
    field :natural_language_properties, :string
    field :properties, Datum.JSONB

    # owned_by can't be foreign key since it's referring to the ops db
    field :owned_by, :binary_id
    # we need to reference the origin - while this could be a virtual field, then
    # we have to set it correctly in each set. Also this lets us combine origin results
    field :origin_id, :binary_id

    field :tags, {:array, :string}
    field :domains, {:array, :string}

    # we are storing relationships as a sparse adjacency list - this means that each piece of data contains the information
    # on the data it is directly connected to within the graph, with no additional information as to other ancestors
    # this allows us to store a graph relatively cheaply and works well with BFS/DFS algorithms and since we're most likely
    # not going to have a more relationships than data, this _should_ work well.
    # These should be stored as a multidimensional array. Passing in lists should work just fine with JASON
    field :incoming_relationships, Datum.JSONB, default: []
    field :outgoing_relationships, Datum.JSONB, default: []

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(origin, attrs) do
    origin
    |> cast(attrs, [
      :path,
      :tags,
      :domains,
      :id,
      :type,
      :file_type,
      :natural_language_properties,
      :properties,
      :original_path,
      :origin_id,
      :owned_by,
      :incoming_relationships,
      :outgoing_relationships,
      :description
    ])
    |> validate_required([:path])
  end
end

defmodule Datum.DataOrigin.DataSearch do
  @moduledoc """
  Reflects the virtual table for FTS5 searching.
  """
  use Ecto.Schema

  @primary_key false
  schema "data_search" do
    field :rowid, :integer
    field :id, :binary_id
    field :path, :string
    field :original_path, :string
    field :file_type, :string
    field :description, :string
    field :natural_language_properties, :string
    field :tags, {:array, :string}
    field :domains, {:array, :string}

    field :rank, :float, virtual: true
  end
end
