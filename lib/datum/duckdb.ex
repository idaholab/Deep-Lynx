defmodule Datum.Duckdb do
  @dialyzer {:nowarn_function, init: 1}
  @moduledoc """
  DuckDB is a GenServer (https://hexdocs.pm/elixir/GenServer.html) which is in charge of running any queries on
  CSV and Parquet files currently. Each instance of this GenServer is an individual DB, interacting with a single
  user through a LiveView.

  Also, _all_ interactions with this genserver should be done asynchronously so that we avoid the application
  hanging while waiting for a db's response, as those could be time consuming depending on hardware and
  load. The db should require a parent pid on init, and then send replies back to that pid on messgages
  it generates.

  Because messages copy all data back and forth, the initial workup of this genserver will send results back
  as a message BUT we will need to find a better way to handle results - such as uploading those results
  to the origin alongside the files.
  """
  use GenServer
  require Logger

  # Client - we need a name on the start_link so we can register it properly
  # parent is required as the communication is async
  def start_link(%{parent: _parent_pid, name: name} = default) do
    GenServer.start_link(__MODULE__, default, name: name)
  end

  @doc """
  Send query will take a user's provided text query and then send it to
  the database connection. This is an async task - replies should be listened for.
  Provide a reference so that you know what reply a message is for
  """
  def send_query(pid, message, opts \\ []) do
    GenServer.cast(pid, {:send_query, message, opts})
  end

  # Server
  @impl true
  def init(%{parent: _parent_pid} = state) do
    # open a connection to the db when you need to use it, connections are
    # native OS threads - not processes!
    case Duckdbex.open(%Duckdbex.Config{
           allow_community_extensions: true,
           autoload_known_extensions: true,
           use_temporary_directory: true
         }) do
      {:ok, db} ->
        {:ok, state |> Map.put(:db, db)}

      _ ->
        {:stop, "unable to open DuckDB"}
    end
  end

  @impl true
  def handle_cast({:send_query, query, opts}, state) do
    msg_id = Keyword.get(opts, :id, UUID.uuid4())
    args = Keyword.get(opts, :args, [])

    with {:ok, conn} <- Duckdbex.connection(state.db),
         {:ok, result_ref} <- Duckdbex.query(conn, query, args) do
      send(
        state.parent,
        {:query_response,
         %{
           id: msg_id,
           result_reference: result_ref
         }}
      )

      Duckdbex.release(conn)
    else
      error ->
        send(
          state.parent,
          {:error,
           %{
             id: msg_id,
             error: error
           }}
        )
    end

    {:noreply, state}
  end

  @impl true
  def handle_call({:receive_result, result_reference}, _from, state) do
    {:reply, Duckdbex.fetch_all(result_reference), state}
  end

  # adding files as a table in the current duckdb instance - the origin will be
  # fetched in order to find and get access to the file(s) through the config
  # locations is a list of the original location of the files, not their location
  # inside the hierarchy - debated on whether or not to accept the full Origin
  # but want to minimize the amount of shared code in this module
  #
  # you can pass in a specific file extension by sending an optional param
  # :extension - this will short-circuit automatic detection and load the requested
  # duckdb extension, currently supported :parquet, :csv, and :json
  # NOTE: if including multiple locations, you must make sure they're all the same
  # kind of files
  @impl true
  def handle_call(
        {:add_data, config, locations, opts},
        _from,
        state
      ) do
    override_ext = Keyword.get(opts, :extension)
    table_name = Keyword.get(opts, :table_name, "file")

    extensions =
      locations
      |> Enum.map(fn location -> MIME.from_path(location) |> MIME.extensions() end)
      |> List.flatten()

    extension =
      if override_ext do
        override_ext
      else
        cond do
          Enum.any?(extensions, fn extension -> extension == "parquet" end) ->
            :parquet

          Enum.any?(extensions, fn extension -> extension == "csv" end) ->
            :csv

          Enum.any?(extensions, fn extension -> extension == "json" end) ->
            :json

          true ->
            :none
        end
      end

    with :ok <- load_secret(config, state.db),
         :ok <- load_files(extension, locations, table_name, state.db) do
      {:reply, :ok, state}
    else
      error -> {:reply, {:error, error}, state}
    end
  end

  # this is the only part of the module that references code in the greater module
  # it was just easier to do the pattern matching for the config based on real
  # configs
  #
  # https://duckdb.org/docs/extensions/httpfs/s3api.html
  defp load_secret(%Datum.DataOrigin.Origin.S3Config{} = config, db) do
    query = """
    CREATE SECRET secret#{:rand.uniform(99)} (
    TYPE S3,
    KEY_ID '#{config.access_key_id}',
    SECRET '#{config.secret_access_key}',
    REGION  '#{config.region}',
    ENDPOINT '#{Map.get(config, :endpoint, "s3.amazonaws.com")}',
    SCOPE '#{config.bucket}'
    );
    """

    with {:ok, conn} <- Duckdbex.connection(db),
         {:ok, result_ref} <- Duckdbex.query(conn, query),
         [[true]] <- Duckdbex.fetch_all(result_ref) do
      :ok
    else
      error -> {:error, error}
    end
  end

  # https://duckdb.org/docs/guides/network_cloud_storage/cloudflare_r2_import.html
  defp load_secret(%Datum.DataOrigin.Origin.R2Config{} = config, db) do
    query = """
    CREATE SECRET secret#{:rand.uniform(99)} (
    TYPE R2,
    KEY_ID '#{config.key_id}',
    SECRET '#{config.secret}',
    ACCOUNT_ID '#{config.account_id}',
    );
    """

    with {:ok, conn} <- Duckdbex.connection(db),
         {:ok, _} <- Duckdbex.query(conn, "INSTALL 'httpfs';"),
         {:ok, _} <- Duckdbex.query(conn, "LOAD 'httpfs';"),
         {:ok, result_ref} <- Duckdbex.query(conn, query),
         [[true]] <- Duckdbex.fetch_all(result_ref) do
      :ok
    else
      error -> {:error, error}
    end
  end

  # https://duckdb.org/docs/extensions/azure.html#authentication-with-secret
  defp load_secret(%Datum.DataOrigin.Origin.AzureConfig{} = config, db) do
    query = """
    CREATE SECRET secret#{:rand.uniform(99)} (
    TYPE AZURE,
    CONNECTION_STRING '#{config.connection_string}',
    SCOPE '#{config.container}',
    );
    """

    with {:ok, conn} <- Duckdbex.connection(db),
         {:ok, _} <- Duckdbex.query(conn, "INSTALL 'azure';"),
         {:ok, _} <- Duckdbex.query(conn, "LOAD 'azure';"),
         {:ok, result_ref} <- Duckdbex.query(conn, query),
         [[true]] <- Duckdbex.fetch_all(result_ref) do
      :ok
    else
      error -> {:error, error}
    end
  end

  # we don't actually need to anything for this right now, just return :ok
  defp load_secret(%Datum.DataOrigin.Origin.FilesystemConfig{} = _config, _db) do
    :ok
  end

  # these are the functions for actually loading the files at tables - the final option
  # is for running the statement without the specific read statements - might not work
  defp load_files(:csv, locations, table_name, db) do
    with {:ok, conn} <- Duckdbex.connection(db),
         {:ok, result_ref} <-
           Duckdbex.query(
             conn,
             "CREATE TABLE #{table_name} AS SELECT * FROM read_csv([#{Enum.map_join(locations, ",", fn location -> ~s("#{location}") end)}]);"
           ),
         [[_count]] <- Duckdbex.fetch_all(result_ref) do
      :ok
    else
      error -> {:error, error}
    end
  end

  defp load_files(:parquet, locations, table_name, db) do
    with {:ok, conn} <- Duckdbex.connection(db),
         {:ok, _} <- Duckdbex.query(conn, "INSTALL 'parquet';"),
         {:ok, _} <- Duckdbex.query(conn, "LOAD 'parquet';"),
         {:ok, result_ref} <-
           Duckdbex.query(
             conn,
             "CREATE TABLE #{table_name} AS SELECT * FROM read_parquet([#{Enum.map_join(locations, ",", fn location -> ~s("#{location}") end)}]);"
           ),
         [[_count]] <- Duckdbex.fetch_all(result_ref) do
      :ok
    else
      error -> {:error, error}
    end
  end

  defp load_files(:json, locations, table_name, db) do
    with {:ok, conn} <- Duckdbex.connection(db),
         {:ok, _} <- Duckdbex.query(conn, "INSTALL 'json';"),
         {:ok, _} <- Duckdbex.query(conn, "LOAD 'json';"),
         {:ok, result_ref} <-
           Duckdbex.query(
             conn,
             "CREATE TABLE #{table_name} AS SELECT * FROM read_json([#{Enum.map_join(locations, ",", fn location -> ~s("#{location}") end)}]);"
           ),
         # it's weird, but this is what DUCKDB should return - nothing
         [[_count]] <- Duckdbex.fetch_all(result_ref) do
      :ok
    else
      error -> {:error, error}
    end
  end

  # if the file doesn't meet requirements for the specific scanner, its why its the last
  defp load_files(_none, locations, table_name, db) do
    if Enum.count(locations) > 1 do
      {:error, "too many files for extension type"}
    else
      with {:ok, conn} <- Duckdbex.connection(db),
           {:ok, result_ref} <-
             Duckdbex.query(
               conn,
               "CREATE TABLE #{table_name} AS SELECT * FROM '#{List.first(locations)}';"
             ),
           # it's weird, but this is what DUCKDB should return - nothing
           [~c"\n"] <- Duckdbex.fetch_all(result_ref) do
        :ok
      else
        error -> {:error, error}
      end
    end
  end
end
