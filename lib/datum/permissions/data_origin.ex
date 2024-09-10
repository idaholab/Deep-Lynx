defmodule Datum.Permissions.DataOrigin do
  @moduledoc """
  Permissions table for DataOrigins - reference this table whenever you're loading
  origins. Try to do so as part of the query itself, not a separate call.
  """
  alias Datum.DataOrigin.Origin
  alias Datum.Accounts.User
  alias Datum.Accounts.Group
  use Ecto.Schema
  import Ecto.Changeset

  schema "permissions_data_origin" do
    belongs_to :origin, Origin, type: :binary_id, foreign_key: :data_origin_id
    belongs_to :user, User, type: :binary_id, foreign_key: :user_id
    belongs_to :group, Group, type: :binary_id, foreign_key: :group_id
    field :permission_type, Ecto.Enum, values: [:read, :readwrite]

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(data_origin, attrs) do
    data_origin
    |> cast(attrs, [:data_origin_id, :user_id, :group_id, :permission_type])
    |> validate_required([:data_origin_id, :permission_type])
  end
end
