defmodule Datum.DataOrigin do
  @moduledoc """
  The DataOrigin context.
  """

  import Ecto.Query, warn: false
  alias Datum.Accounts.Group
  alias Datum.DataOrigin
  alias Datum.Repo
  alias Datum.DataOrigin.OriginRepo

  alias Datum.DataOrigin.Origin
  alias Datum.DataOrigin.Data
  alias Datum.Accounts.User
  alias Datum.Accounts.UserGroup

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
  Returns a list of data_origins for a user - taking into account
  their groups and permissions for said origins.
  """
  def list_data_orgins_user(%User{} = user) do
    query =
      from o in Origin,
        distinct: true,
        left_join: p in Datum.Permissions.DataOrigin,
        on: o.id == p.data_origin_id,
        where:
          (p.user_id == ^user.id or
             p.group_id in subquery(
               from g in UserGroup, where: g.user_id == ^user.id, select: g.group_id
             )) and p.permission_type in [:read, :readwrite],
        select: o

    Repo.all(query)
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

  alias Datum.DataOrigin.ExtractedMetadata

  @doc """
  Returns the list of extracted_metadatas.

  ## Examples

      iex> list_extracted_metadatas()
      [%ExtractedMetadata{}, ...]

  """
  def list_extracted_metadatas do
    Repo.all(ExtractedMetadata)
  end

  @doc """
  Gets a single extracted_metadata.

  Raises `Ecto.NoResultsError` if the Extracted metadata does not exist.

  ## Examples

      iex> get_extracted_metadata!(123)
      %ExtractedMetadata{}

      iex> get_extracted_metadata!(456)
      ** (Ecto.NoResultsError)

  """
  def get_extracted_metadata!(id), do: Repo.get!(ExtractedMetadata, id)

  @doc """
  Creates a extracted_metadata.

  ## Examples

      iex> create_extracted_metadata(%{field: value})
      {:ok, %ExtractedMetadata{}}

      iex> create_extracted_metadata(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_extracted_metadata(attrs \\ %{}) do
    %ExtractedMetadata{}
    |> ExtractedMetadata.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a extracted_metadata.

  ## Examples

      iex> update_extracted_metadata(extracted_metadata, %{field: new_value})
      {:ok, %ExtractedMetadata{}}

      iex> update_extracted_metadata(extracted_metadata, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_extracted_metadata(%ExtractedMetadata{} = extracted_metadata, attrs) do
    extracted_metadata
    |> ExtractedMetadata.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a extracted_metadata.

  ## Examples

      iex> delete_extracted_metadata(extracted_metadata)
      {:ok, %ExtractedMetadata{}}

      iex> delete_extracted_metadata(extracted_metadata)
      {:error, %Ecto.Changeset{}}

  """
  def delete_extracted_metadata(%ExtractedMetadata{} = extracted_metadata) do
    Repo.delete(extracted_metadata)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking extracted_metadata changes.

  ## Examples

      iex> change_extracted_metadata(extracted_metadata)
      %Ecto.Changeset{data: %ExtractedMetadata{}}

  """
  def change_extracted_metadata(%ExtractedMetadata{} = extracted_metadata, attrs \\ %{}) do
    ExtractedMetadata.changeset(extracted_metadata, attrs)
  end
end
