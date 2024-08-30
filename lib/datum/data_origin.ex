defmodule Datum.DataOrigin do
  @moduledoc """
  The DataOrigin context.
  """

  import Ecto.Query, warn: false
  alias Datum.Repo
  alias Datum.DataOrigin.OriginRepo

  alias Datum.DataOrigin.Origin
  alias Datum.DataOrigin.Data

  @doc """
  Returns the list of data_origins.

  ## Examples

      iex> list_data_origins()
      [%Origin{}, ...]

  """
  def list_data_origins do
    Repo.all(Origin)
  end

  @doc """
  Gets a single origin.

  Raises `Ecto.NoResultsError` if the Origin does not exist.

  ## Examples

      iex> get_origin!(123)
      %Origin{}

      iex> get_origin!(456)
      ** (Ecto.NoResultsError)

  """
  def get_origin!(id), do: Repo.get!(Origin, id)

  @doc """
  Creates a origin.

  ## Examples

      iex> create_origin(%{field: value})
      {:ok, %Origin{}}

      iex> create_origin(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_origin(attrs \\ %{}) do
    %Origin{}
    |> Origin.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a origin.

  ## Examples

      iex> update_origin(origin, %{field: new_value})
      {:ok, %Origin{}}

      iex> update_origin(origin, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_origin(%Origin{} = origin, attrs) do
    origin
    |> Origin.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a origin.

  ## Examples

      iex> delete_origin(origin)
      {:ok, %Origin{}}

      iex> delete_origin(origin)
      {:error, %Ecto.Changeset{}}

  """
  def delete_origin(%Origin{} = origin) do
    Repo.delete(origin)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking origin changes.

  ## Examples

      iex> change_origin(origin)
      %Ecto.Changeset{data: %Origin{}}

  """
  def change_origin(%Origin{} = origin, attrs \\ %{}) do
    Origin.changeset(origin, attrs)
  end

  def add_data(%Origin{} = origin, attrs \\ %{}) do
    OriginRepo.with_dynamic_repo(origin, fn ->
      %Data{}
      |> Data.changeset(attrs)
      |> OriginRepo.insert()
    end)
  end

  def add_data!(%Origin{} = origin, attrs \\ %{}) do
    OriginRepo.with_dynamic_repo(origin, fn ->
      %Data{}
      |> Data.changeset(attrs)
      |> OriginRepo.insert!()
    end)
  end

  def connect_data(%Origin{} = origin, %Data{} = parent, %Data{} = child) do
    OriginRepo.with_dynamic_repo(origin, fn ->
      Datum.DataOrigin.CT.insert(parent.id, child.id)
    end)
  end
end
