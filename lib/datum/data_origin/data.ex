defmodule Datum.DataOrigin.Data do
  @moduledoc """
  Data is the actual stored data for an origin, typically represents a file or directory,
  but more types are supported and will be supported as time continues.
  """
  alias Datum.DataOrigin.Origin
  use Ecto.Schema
  import Ecto.Changeset

  # this is how to tell the json encoder what fields to encode
  @derive {Jason.Encoder,
           only: [
             :id,
             :path,
             :type,
             :file_type,
             :description,
             :properties,
             :owned_by,
             :origin_id,
             :tags,
             :domains,
             :incoming_relationships,
             :outgoing_relationships
           ]}

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "data" do
    # virtual fields are those added by various queries, just simplifies working with this data structure
    field :row_num, :integer, virtual: true
    field :count, :integer, virtual: true
    field :description_snippet, :string, virtual: true
    field :natural_language_properties_snippet, :string, virtual: true

    field :in_compliance, :boolean, default: false
    field :path, :string
    field :original_path, :string
    field :type, Ecto.Enum, values: [:directory, :file, :root_directory, :organization, :person]
    field :file_type, :string, default: nil
    field :description, :string
    field :natural_language_properties, :string
    field :properties, :map

    # owned_by can't be foreign key since it's referring to the ops db
    field :owned_by, :binary_id
    # we need to reference the origin - while this could be a virtual field, then
    # we have to set it correctly in each set. Also this lets us combine origin results
    belongs_to :origin, Origin, type: :binary_id, foreign_key: :origin_id

    field :tags, {:array, :string}, default: []
    field :domains, {:array, :string}, default: []

    # we are storing relationships as a sparse adjacency list - this means that each piece of data contains the information
    # on the data it is directly connected to within the graph, with no additional information as to other ancestors
    # this allows us to store a graph relatively cheaply and works well with BFS/DFS algorithms and since we're most likely
    # not going to have a more relationships than data, this _should_ work well.
    # format should be {data_id, origin_id, type (optional)}
    field :incoming_relationships, {:array, {:array, :string}}, default: []
    field :outgoing_relationships, {:array, {:array, :string}}, default: []

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(origin, attrs) do
    origin
    |> cast(attrs, [
      :path,
      :tags,
      :in_compliance,
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
