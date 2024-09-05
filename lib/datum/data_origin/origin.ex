defmodule Datum.DataOrigin.Origin do
  use Ecto.Schema
  import Ecto.Changeset

  alias Datum.Accounts.User

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "data_origins" do
    field :name, :string
    belongs_to :owner, User, type: :binary_id, foreign_key: :owned_by

    field :classifications, {:array, :string}
    field :tags, {:array, :string}
    field :domains, {:array, :string}

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(origin, attrs) do
    origin
    |> cast(attrs, [:name])
    |> validate_required([:name])
  end
end
