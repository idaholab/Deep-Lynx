defmodule Datum.Permissions do
  @moduledoc """
  The Permissions context. See the permissions folder for information.
  """

  import Ecto.Query, warn: false
  alias Datum.Repo

  alias Datum.Permissions.DataOrigin

  @doc """
  Returns the list of permissions_data_origin.

  ## Examples

      iex> list_permissions_data_origin()
      [%DataOrigin{}, ...]

  """
  def list_permissions_data_origin do
    Repo.all(DataOrigin)
  end

  @doc """
  Gets a single data_origin.

  Raises `Ecto.NoResultsError` if the Data origin does not exist.

  ## Examples

      iex> get_data_origin!(123)
      %DataOrigin{}

      iex> get_data_origin!(456)
      ** (Ecto.NoResultsError)

  """
  def get_data_origin!(id), do: Repo.get!(DataOrigin, id)

  @doc """
  Creates a data_origin.

  ## Examples

      iex> create_data_origin(%{field: value})
      {:ok, %DataOrigin{}}

      iex> create_data_origin(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_data_origin(attrs \\ %{}) do
    %DataOrigin{}
    |> DataOrigin.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a data_origin.

  ## Examples

      iex> update_data_origin(data_origin, %{field: new_value})
      {:ok, %DataOrigin{}}

      iex> update_data_origin(data_origin, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_data_origin(%DataOrigin{} = data_origin, attrs) do
    data_origin
    |> DataOrigin.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a data_origin.

  ## Examples

      iex> delete_data_origin(data_origin)
      {:ok, %DataOrigin{}}

      iex> delete_data_origin(data_origin)
      {:error, %Ecto.Changeset{}}

  """
  def delete_data_origin(%DataOrigin{} = data_origin) do
    Repo.delete(data_origin)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking data_origin changes.

  ## Examples

      iex> change_data_origin(data_origin)
      %Ecto.Changeset{data: %DataOrigin{}}

  """
  def change_data_origin(%DataOrigin{} = data_origin, attrs \\ %{}) do
    DataOrigin.changeset(data_origin, attrs)
  end
end
