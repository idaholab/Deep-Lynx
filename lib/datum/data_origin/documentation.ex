defmodule Datum.DataOrigin.Documentation do
  @moduledoc """
  Documenation for a piece of data. It's stored in a separate table vs.
  embedded schema so that we can do things like semantic search on it since
  there will often be more than one piece of documentation.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "documentation" do
    field :body, :string
    belongs_to :data, Datum.DataOrigin.Data, foreign_key: :data_id, type: :binary_id

    # owned_by can't be foreign key since it's referring to the ops db
    field :owned_by, :binary_id

    field :tags, {:array, :string}

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(origin, attrs) do
    origin
    |> cast(attrs, [:body, :owned_by, :data_id])
    |> validate_required([:body])
  end
end
