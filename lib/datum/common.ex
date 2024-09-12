defmodule Datum.Common do
  @moduledoc """
  The Common context.
  """

  import Ecto.Query, warn: false
  alias Datum.Repo

  alias Datum.Common.ExplorerTabs
  alias Datum.Accounts.User

  @doc """
  Returns the list of explorer_tabs.

  ## Examples

      iex> list_explorer_tabs()
      [%ExplorerTabs{}, ...]

  """
  def list_explorer_tabs do
    Repo.all(ExplorerTabs)
  end

  def explorer_tabs_for_user(%User{} = user) do
    Repo.all(from e in ExplorerTabs, where: e.user_id == ^user.id)
  end

  def list_open_tabs(%User{} = user, tabs) do
    Repo.all(from e in ExplorerTabs, where: e.user_id == ^user.id and e.id in ^tabs)
  end

  def get_user_tab(%User{} = user, tab_id) do
    Repo.one(from e in ExplorerTabs, where: e.user_id == ^user.id and e.id == ^tab_id)
  end

  def get_user_tab!(%User{} = user, tab_id) do
    Repo.one!(from e in ExplorerTabs, where: e.user_id == ^user.id and e.id == ^tab_id)
  end

  @doc """
  Gets a single explorer_tabs.

  Raises `Ecto.NoResultsError` if the Explorer tabs does not exist.

  ## Examples

      iex> get_explorer_tabs!(123)
      %ExplorerTabs{}

      iex> get_explorer_tabs!(456)
      ** (Ecto.NoResultsError)

  """
  def get_explorer_tabs!(id), do: Repo.get!(ExplorerTabs, id)

  @doc """
  Creates a explorer_tabs.

  ## Examples

      iex> create_explorer_tabs(%{field: value})
      {:ok, %ExplorerTabs{}}

      iex> create_explorer_tabs(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_explorer_tabs(attrs \\ %{}) do
    %ExplorerTabs{}
    |> ExplorerTabs.changeset(attrs)
    |> Repo.insert()
  end

  def create_explorer_tabs_for_user(%User{} = user, attrs \\ %{}) do
    %ExplorerTabs{}
    |> ExplorerTabs.changeset_user(user, attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a explorer_tabs.

  ## Examples

      iex> update_explorer_tabs(explorer_tabs, %{field: new_value})
      {:ok, %ExplorerTabs{}}

      iex> update_explorer_tabs(explorer_tabs, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_explorer_tabs(%ExplorerTabs{} = explorer_tabs, attrs) do
    explorer_tabs
    |> ExplorerTabs.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a explorer_tabs.

  ## Examples

      iex> delete_explorer_tabs(explorer_tabs)
      {:ok, %ExplorerTabs{}}

      iex> delete_explorer_tabs(explorer_tabs)
      {:error, %Ecto.Changeset{}}

  """
  def delete_explorer_tabs(%ExplorerTabs{} = explorer_tabs) do
    Repo.delete(explorer_tabs)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking explorer_tabs changes.

  ## Examples

      iex> change_explorer_tabs(explorer_tabs)
      %Ecto.Changeset{data: %ExplorerTabs{}}

  """
  def change_explorer_tabs(%ExplorerTabs{} = explorer_tabs, attrs \\ %{}) do
    ExplorerTabs.changeset(explorer_tabs, attrs)
  end
end
