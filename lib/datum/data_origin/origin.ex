defmodule Datum.DataOrigin.Origin do
  @moduledoc """
  Represents a point of origin for data. Typically we view these as file systems, network drives,
  HPC clusters etc. It's a logical, hierarchical separation of data that is representive of a filesystem.
  Origins should contain a lot of data - but if they start to grow too large we'll need to look at separating them
  or figuring how to handle splitting the underlying Sqlite3 database. That's right - each Origin has it's OWN Sqlite3
  databased stored at the configured filesystem point.

  Separate databases allow us to search them concurrently, handle need to know and permissions across a better security surface (can't)
  break out of a table if you're not even in the database, and to handle differing encryption and classification needs for the origins.
  The endgoal here is that these origin's might be running on different servers, or even typically available in other networks, but attached
  to an operational database.

  Note: while currently not the case, it is hypothesized that an Origin _could_ eventually belong to more than one instance of the main
  Datum server.
  """
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
    |> cast(attrs, [:name, :owned_by, :classifications, :tags, :domains])
    |> validate_required([:name])
  end
end
