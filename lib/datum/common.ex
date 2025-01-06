defmodule Datum.Common do
  @moduledoc """
  The Common context. Dealing with the models that don't fit nicely into other
  contexts, such as the explorer tab context.
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

  # The ResourceLock section
  #
  #  When taking out locks for a user, do not use this generate_lock function directly
  #  as we do no permissions checking to figure out if a user has permissions to lock
  #  said resource - we don't want to pollute this module with any information about
  #  permissions.

  #  Instead, wrap this function from the calling Context and ensure permissions are checked
  #  there.

  alias Datum.Common.ResourceLocks

  @doc """
   this is used _only_ in testing. DO NOT USE as it performs no checks on create
  """
  def create_resource_locks(attrs \\ %{}) do
    %ResourceLocks{}
    |> ResourceLocks.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  The primary locking mechanism - the atom representing resource type will allow us to
  pattern-match on resource type if needed in the future so that we perform any special
  needs on that resource prior to locking.

  ## Examples
      iex> lock_resource(:data_origin, "resource UUID", user)
      {:ok, %ResourceLocks{}}

      iex> lock_resource(:data_origin, "resource UUID", user)
      {:error, message (:resource_locked or string representing DB error)}
  """

  def lock_resource(resource_type, resource_id, %User{} = user, _opts \\ [])
      when resource_type in [:data_origin] do
    # first, we check to see if there is an existing lock on the resource - ANY return means
    # there's an existing lock who's expires_at timestamp has not come to pass

    existing_locks =
      Repo.all(
        from rl in ResourceLocks,
          where:
            rl.expires_at > fragment("datetime('now')") and rl.resource_type == ^resource_type and
              rl.resource_id == ^resource_id,
          select: rl
      )

    if existing_locks != [] do
      {:error, :resource_locked}
    else
      %ResourceLocks{}
      |> ResourceLocks.changeset(%{
        resource_type: resource_type,
        resource_id: resource_id,
        locked_by: user.id
      })
      |> Repo.insert()
    end
  end

  @doc """
  Returns the list of resource_locks.

  ## Examples

      iex> list_resource_locks()
      [%ResourceLocks{}, ...]

  """
  def list_resource_locks do
    Repo.all(ResourceLocks)
  end

  @doc """
  Gets a single resource_locks.

  Raises `Ecto.NoResultsError` if the Resource locks does not exist.

  ## Examples

      iex> get_resource_locks!(123)
      %ResourceLocks{}

      iex> get_resource_locks!(456)
      ** (Ecto.NoResultsError)

  """
  def get_resource_locks!(id), do: Repo.get!(ResourceLocks, id)

  @doc """
  Updates a resource_locks.

  ## Examples

      iex> update_resource_locks(resource_locks, %{field: new_value})
      {:ok, %ResourceLocks{}}

      iex> update_resource_locks(resource_locks, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_resource_locks(%ResourceLocks{} = resource_locks, attrs) do
    resource_locks
    |> ResourceLocks.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a resource_locks.

  ## Examples

      iex> delete_resource_locks(resource_locks)
      {:ok, %ResourceLocks{}}

      iex> delete_resource_locks(resource_locks)
      {:error, %Ecto.Changeset{}}

  """
  def delete_resource_locks(%ResourceLocks{} = resource_locks) do
    Repo.delete(resource_locks)
  end

  def prune_expired_locks() do
    Repo.delete_all(
      from rl in ResourceLocks,
        where: rl.expires_at <= ^DateTime.utc_now()
    )
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking resource_locks changes.

  ## Examples

      iex> change_resource_locks(resource_locks)
      %Ecto.Changeset{data: %ResourceLocks{}}

  """
  def change_resource_locks(%ResourceLocks{} = resource_locks, attrs \\ %{}) do
    ResourceLocks.changeset(resource_locks, attrs)
  end
end
