defmodule Datum.DataOrigin do
  @moduledoc """
  The DataOrigin context.
  """

  import Ecto.Query, warn: false
  alias Datum.DataOrigin.DataSearch
  alias Datum.DataOrigin.DataTreePath
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
  def list_data_orgins_user(%User{} = user, exclude \\ []) do
    query =
      from o in Origin,
        distinct: true,
        left_join: p in Datum.Permissions.DataOrigin,
        on: o.id == p.data_origin_id,
        where:
          (p.user_id == ^user.id or
             p.group_id in subquery(
               from g in UserGroup, where: g.user_id == ^user.id, select: g.group_id
             )) and p.permission_type in [:read, :readwrite] and o.id not in ^exclude,
        select: o

    Repo.all(query)
  end

  def get_data_orgins_user(%User{} = user, origin_id) do
    query =
      from o in Origin,
        distinct: true,
        left_join: p in Datum.Permissions.DataOrigin,
        on: o.id == p.data_origin_id,
        where:
          (p.user_id == ^user.id or
             p.group_id in subquery(
               from g in UserGroup, where: g.user_id == ^user.id, select: g.group_id
             )) and p.permission_type in [:read, :readwrite] and o.id == ^origin_id,
        select: o

    Repo.one(query)
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
    with {:ok, origin} <-
           %Origin{}
           |> Origin.changeset(attrs)
           |> Repo.insert(),
         {:ok, _perm} <-
           Datum.Permissions.create_data_origin(%{
             data_origin_id: origin.id,
             user_id: origin.owned_by,
             permission_type: :readwrite
           }) do
      {:ok, origin}
    else
      err -> err
    end
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
      with {:ok, data} <-
             %Data{}
             |> Data.changeset(Map.put(attrs, :origin_id, origin.id))
             |> OriginRepo.insert(),
           {:ok, _perm} <-
             %Datum.Permissions.Data{}
             |> Datum.Permissions.Data.changeset(%{
               data_id: data.id,
               user_id: data.owned_by,
               permission_type: :readwrite
             })
             |> OriginRepo.insert() do
        {:ok, data}
      else
        err -> {:error, err}
      end
    end)
  end

  def add_data!(%Origin{} = origin, attrs \\ %{}) do
    OriginRepo.with_dynamic_repo(origin, fn ->
      with %Data{} = data <-
             %Data{}
             |> Data.changeset(Map.put(attrs, :origin_id, origin.id))
             |> OriginRepo.insert!(),
           %Datum.Permissions.Data{} = _perm <-
             %Datum.Permissions.Data{}
             |> Datum.Permissions.Data.changeset(%{
               data_id: data.id,
               user_id: data.owned_by,
               permission_type: :readwrite
             })
             |> OriginRepo.insert!() do
        data
      else
        err -> {:error, err}
      end
    end)
  end

  def connect_data(%Origin{} = origin, %Data{} = ancestor, %Data{} = leaf) do
    OriginRepo.with_dynamic_repo(origin, fn ->
      Datum.DataOrigin.CT.insert(leaf.id, ancestor.id)
    end)
  end

  def get_data_user(%Origin{} = origin, %User{} = user, data_id) do
    groups =
      Repo.all(
        from g in UserGroup,
          where: g.user_id == ^user.id,
          select: g.group_id
      )

    OriginRepo.with_dynamic_repo(
      origin,
      fn ->
        query =
          from d in Data,
            distinct: true,
            left_join: p in Datum.Permissions.Data,
            on: d.id == p.data_id,
            where:
              (p.user_id == ^user.id or
                 p.group_id in ^groups) and p.permission_type in [:read, :readwrite] and
                d.id == ^data_id,
            select: d

        OriginRepo.one(query)
      end,
      mode: :readonly
    )
  end

  def list_data_user(%Origin{} = origin, %User{} = user, opts \\ []) do
    only_ids = Keyword.get(opts, :only_ids)

    groups =
      Repo.all(
        from g in UserGroup,
          where: g.user_id == ^user.id,
          select: g.group_id
      )

    OriginRepo.with_dynamic_repo(
      origin,
      fn ->
        query =
          from d in Data,
            distinct: true,
            left_join: p in Datum.Permissions.Data,
            on: d.id == p.data_id,
            where:
              (p.user_id == ^user.id or
                 p.group_id in ^groups) and p.permission_type in [:read, :readwrite],
            select: d

        query =
          if only_ids do
            from d in query, where: d.id in ^only_ids
          else
            query
          end

        OriginRepo.all(query)
      end,
      mode: :readonly
    )
  end

  def list_data_descendants_user(%Origin{} = origin, %User{} = user, data_id) do
    groups =
      Repo.all(
        from g in UserGroup,
          where: g.user_id == ^user.id,
          select: g.group_id
      )

    OriginRepo.with_dynamic_repo(
      origin,
      fn ->
        subquery =
          from d in Data,
            join: p in DataTreePath,
            as: :tree,
            on: d.id == p.descendant,
            where: p.ancestor == ^data_id and p.descendant != p.ancestor,
            order_by: [asc: p.depth],
            select: d.id

        query =
          from d in Data,
            distinct: true,
            left_join: p in Datum.Permissions.Data,
            on: d.id == p.data_id,
            where:
              (p.user_id == ^user.id or
                 p.group_id in ^groups) and p.permission_type in [:read, :readwrite] and
                d.id in subquery(subquery),
            order_by: [asc: d.type],
            select: d

        OriginRepo.all(query)
      end,
      mode: :readonly
    )
  end

  def list_roots(%Origin{} = origin) do
    OriginRepo.with_dynamic_repo(
      origin,
      fn ->
        query =
          from d in Data,
            distinct: true,
            ## this marks a root file system in CTE
            where: d.type == :root_directory

        OriginRepo.all(query)
      end,
      mode: :readonly
    )
  end

  @page_size 10_000

  def search_origin(%Origin{} = origin, %Datum.Accounts.User{} = user, search_term, opts \\ []) do
    groups =
      Repo.all(
        from g in Datum.Accounts.UserGroup,
          where: g.user_id == ^user.id,
          select: g.group_id
      )

    OriginRepo.with_dynamic_repo(
      origin,
      fn ->
        if search_term == "" do
          []
        else
          page = Keyword.get(opts, :page, 0)
          page_size = Keyword.get(opts, :page_size, @page_size)

          # dashes are interpreted as column filters, so we want to remove that
          search_term = String.replace(search_term, "-", "")
          lower = page_size * page
          upper = page_size * (page + 1)

          subquery =
            from d in Data,
              join: p in Datum.Permissions.Data,
              on: d.id == p.data_id,
              where:
                ((p.user_id == ^user.id or
                    p.group_id in ^groups) and p.permission_type in [:read, :readwrite]) or
                  is_nil(p.user_id),
              select: d.id

          query =
            from ds in DataSearch,
              join: d in Data,
              on: ds.id == d.id,
              where:
                fragment(
                  "data_search MATCH (?)",
                  ^search_term
                ) and d.id in subquery(subquery),
              order_by: fragment("bm25(data_search,1.0, 5.0, 5.0,7.0,7.0,8.0,9.0,9.0,9.0)"),
              select: %{
                d
                | description_snippet:
                    fragment("""
                    snippet(data_search,3,'', '',',', 64)
                    """),
                  natural_language_properties_snippet:
                    fragment("""
                    snippet(data_search,5,'', '',',', 64)
                    """)
              }

          outter =
            from q in subquery(query),
              select: %{
                q
                | row_num:
                    row_number()
                    |> over(),
                  count: count() |> over()
              }

          OriginRepo.all(
            from q in subquery(outter),
              where: q.row_num > ^lower and q.row_num <= ^upper,
              select: q
          )
        end
      end,
      mode: :readonly
    )
    # allows us to use the operational repo and load the results origins in one call
    |> Repo.preload(:origin)
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
