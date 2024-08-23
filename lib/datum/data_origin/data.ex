defmodule Datum.DataOrigin.Data do
  @moduledoc """
  Data is the actual stored data for an origin.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: false}
  schema "data" do
    field :path, {:array, :string}
    field :terminal_path, :string
    field :full_path, :string
    field :metadata, Datum.JSONB
    field :owned_by, :binary_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(origin, attrs) do
    changeset =
      origin
      |> cast(attrs, [:path, :terminal_path, :metadata, :id])
      |> validate_required([:terminal_path])

    put_change(changeset, :id, UUID.uuid3(nil, fetch_field!(changeset, :terminal_path)))
  end
end
