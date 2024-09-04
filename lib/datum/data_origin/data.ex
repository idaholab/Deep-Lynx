defmodule Datum.DataOrigin.Data do
  @moduledoc """
  Data is the actual stored data for an origin.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: false}
  schema "data" do
    field :path, :string
    field :original_path, :string
    field :type, Ecto.Enum, values: [:directory, :file]
    field :file_type, :string, default: nil
    field :properties, Datum.JSONB

    field :owned_by, :binary_id

    field :tags, {:array, :string}
    field :domains, {:array, :string}

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(origin, attrs) do
    changeset =
      origin
      |> cast(attrs, [:path, :properties, :id, :type])
      |> validate_required([:path])

    put_change(changeset, :id, UUID.uuid3(nil, fetch_field!(changeset, :path)))
  end
end
