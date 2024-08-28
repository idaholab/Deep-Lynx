defmodule Datum.DataOrigin.Data do
  @moduledoc """
  Data is the actual stored data for an origin.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: false}
  schema "data" do
    field :path, :string
    field :type, Ecto.Enum, values: [:directory, :file, :executable]
    field :metadata, Datum.JSONB
    field :owned_by, :binary_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(origin, attrs) do
    changeset =
      origin
      |> cast(attrs, [:path, :metadata, :id, :type])
      |> validate_required([:path])

    put_change(changeset, :id, UUID.uuid3(nil, fetch_field!(changeset, :path)))
  end
end
