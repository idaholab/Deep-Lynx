defmodule Datum.Accounts.Group do
  @moduledoc """
  Groups are user or system defined groupings of users. Groups do
  not inherently have any permissions in the system - they are only
  used to group users together when setting permissions in other systems.
  end

  """
  alias Datum.Accounts.User
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "groups" do
    field :name, :string
    belongs_to :owner, User, type: :binary_id, foreign_key: :owner_id
    many_to_many :users, User, join_through: Datum.Accounts.UserGroup

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(group, attrs) do
    group
    |> cast(attrs, [:name])
    |> validate_required([:name])
  end
end

defmodule Datum.Accounts.UserGroup do
  @moduledoc """
  User Groups are just the collection of membership for a particular group.
  At time of creation, there are currently no plans to have roles inside the groups.
  end

  """
  alias Datum.Accounts.User
  alias Datum.Accounts.Group

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  schema "user_groups" do
    belongs_to :user, User
    belongs_to :group, Group

    timestamps()
  end

  @doc false
  def changeset(group, attrs) do
    group
    |> cast(attrs, [:user_id, :group_id])
  end
end
