defmodule Datum.Permissions.Data do
  @moduledoc """
  Permissions table for Data in a DataOrigin- reference this table whenever you're loading
  data. Try to do so as part of the query itself, not a separate call.
  """
  alias Datum.DataOrigin.Data
  alias Datum.Accounts.User
  alias Datum.Accounts.Group
  use Ecto.Schema
  import Ecto.Changeset

  schema "permissions_data" do
    belongs_to :data, Data, type: :binary_id, foreign_key: :data_id
    # keep in mind that in the sqlite3 db these are not true foreign keys
    # and will not throw a fit if you screw them up, this is because the
    # data is in a separate db than the group and user info
    belongs_to :user, User, type: :binary_id, foreign_key: :user_id
    belongs_to :group, Group, type: :binary_id, foreign_key: :group_id
    field :permission_type, Ecto.Enum, values: [:read, :readwrite]

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(data_origin, attrs) do
    data_origin
    |> cast(attrs, [:data_id, :user_id, :group_id, :permission_type])
    |> validate_required([:data_id, :permission_type])
  end
end
