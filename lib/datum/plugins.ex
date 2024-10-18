defmodule Datum.Plugins do
  @moduledoc """
  The Plugins context.
  """

  import Ecto.Query, warn: false
  alias Datum.Repo

  alias Datum.Plugins.Plugin

  @doc """
  Returns the list of plugins.

  ## Examples

      iex> list_plugins()
      [%Plugin{}, ...]

  """
  def list_plugins do
    Repo.all(Plugin)
  end

  def list_plugins_by_extensions(extensions) when is_list(extensions) do
    query =
      from(p in Plugin)

    Enum.reduce(extensions, query, fn name, query ->
      where(query, [p], ^name in p.filetypes)
    end)
    |> Repo.all()
  end

  def list_plugin_info() do
    query =
      from p in Plugin,
        where: p.enabled == true,
        select: [p.name, p.filetypes, p.plugin_type]

    Repo.all(query)
  end

  @doc """
  Gets a single plugin.

  Raises `Ecto.NoResultsError` if the Plugin does not exist.

  ## Examples

      iex> get_plugin!(123)
      %Plugin{}

      iex> get_plugin!(456)
      ** (Ecto.NoResultsError)

  """
  def get_plugin!(id), do: Repo.get!(Plugin, id)

  @doc """
  Creates a plugin.

  ## Examples

      iex> create_plugin(%{field: value})
      {:ok, %Plugin{}}

      iex> create_plugin(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_plugin(attrs \\ %{}) do
    %Plugin{}
    |> Plugin.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a plugin.

  ## Examples

      iex> update_plugin(plugin, %{field: new_value})
      {:ok, %Plugin{}}

      iex> update_plugin(plugin, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_plugin(%Plugin{} = plugin, attrs) do
    plugin
    |> Plugin.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a plugin.

  ## Examples

      iex> delete_plugin(plugin)
      {:ok, %Plugin{}}

      iex> delete_plugin(plugin)
      {:error, %Ecto.Changeset{}}

  """
  def delete_plugin(%Plugin{} = plugin) do
    Repo.delete(plugin)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking plugin changes.

  ## Examples

      iex> change_plugin(plugin)
      %Ecto.Changeset{data: %Plugin{}}

  """
  def change_plugin(%Plugin{} = plugin, attrs \\ %{}) do
    Plugin.changeset(plugin, attrs)
  end
end
