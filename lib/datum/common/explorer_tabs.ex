defmodule Datum.Common.ExplorerTabs do
  use Ecto.Schema
  import Ecto.Changeset

  alias Datum.Accounts.User

  schema "explorer_tabs" do
    field :module, Datum.ModuleName
    field :state, Datum.JSONB
    belongs_to :user, User, type: :binary_id, foreign_key: :user_id
  end

  @doc false
  def changeset(explorer_tabs, attrs) do
    explorer_tabs
    |> cast(attrs, [:module, :state])
    |> validate_required([:module, :state])
  end

  @doc false
  def changeset_user(explorer_tabs, %User{} = user, attrs) do
    explorer_tabs
    |> cast(attrs, [:module, :state])
    |> put_assoc(:user, user)
    |> validate_required([:module, :state])
  end
end
