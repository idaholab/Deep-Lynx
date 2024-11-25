defmodule Datum.Common.ExplorerTabs do
  @moduledoc """
  ExplorerTabs are the representation of an open viewing tab in the data explorer home.
  This system allows us to easily save and restore a user's workspaces without having to use
  javascript or local storage garbage. Sqlite is more than fast enough, especially with LiveView
  to handle restore/close options.
  """
  use Ecto.Schema
  import Ecto.Changeset

  alias Datum.Accounts.User

  schema "explorer_tabs" do
    field :module, Datum.ModuleName
    field :state, :map
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
