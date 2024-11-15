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
    field :type, Ecto.Enum, values: [:directory, :file, :root_directory]
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
