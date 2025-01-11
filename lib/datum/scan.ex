defmodule Datum.Scan do
  @moduledoc """
  This is a GenServer in charge of running scan processes from the CLI.  
  If you are wanting the server or other processes to run scanning - prefer using the scanner you
  need directly.
  """
  use GenServer
  require Logger
  alias DatumWeb.Client

  def start_link(%{endpoint: _endpoint, token: _token} = state) do
    GenServer.start_link(
      __MODULE__,
      state,
      name: __MODULE__
    )
  end

  def scan(dirs, opts \\ []) do
    GenServer.call(__MODULE__, {:scan, dirs, opts})
  end

  # Server
  @impl true
  def init(
        %{
          endpoint: endpoint,
          token: token
        } = state
      ) do
    # run the migrations and open a read/write connection to local ops db
    # this is needed in case there are any updates to the CLI and ops central db
    {:ok, _, _} = Ecto.Migrator.with_repo(Datum.Repo, &Ecto.Migrator.run(&1, :up, all: true))

    # sync the local operations database with the cloud one for the records we need
    # The reason we're building a local ops db at all is primarily for using plugins
    # this allows us to reuse a bunch of code easily

    # the plug environment lets us override where the scan gets its data when testing
    {:ok, client} =
      Client.new(endpoint, token: token, plug: Application.get_env(:datum, :scan_plug))

    # connect the websocket client, don't need the PID because we register locally by module name
    {:ok, _pid} = DatumWeb.SocketClient.start_link(%{endpoint: endpoint, token: token})

    # fetch the current set of plugins 
    load_plugins(client)

    {:ok, state |> Map.put(:client, client)}
  end

  @impl true
  def handle_call({:scan, directories, opts}, _from, state) do
    {:ok, origin} = load_or_create_origin(state.client)

    # start a supervised task for each of the paths passed in from the args
    # logging will inform the user of any issues etc. It should be it's own
    # origin - but one origin that contains each of these paths as :root_directory
    Task.Supervisor.async_stream_nolink(
      Datum.TaskSupervisor,
      directories,
      fn dir ->
        Datum.Scanners.Filesystem.scan_directory(
          origin,
          Client.current_user_info!(state.client),
          dir,
          user_id: %Datum.Accounts.User{}.id,
          generate_checksum: Keyword.get(opts, :generate_checksum)
        )
      end,
      timeout: :infinity,
      ordered: false,
      max_concurrency: 8
    )
    |> Enum.each(fn _result -> IO.puts("Finished scan") end)

    {:reply, :ok, state}
  end

  defp load_or_create_origin(client) do
    origins = Client.list_origins!(client)

    if origins == [] do
      IO.puts("No existing Data Origins found, creating...")

      origin_name = Prompt.text("Name the Data Origin which should be created")

      Client.create_origin(client, %{name: origin_name})
    else
      case Prompt.select("Please select a Data Origin to upload this data to:", [
             {"Create New", :new}
             | Enum.map(origins, fn origin -> {origin["name"], origin} end)
           ]) do
        :new ->
          origin_name = Prompt.text("Name the Data Origin which should be created")
          Client.create_origin(client, %{name: origin_name})

        origin ->
          Client.create_origin(client, origin)
      end
    end
  end

  # this loads the plugins from the remote database - this is currently non-idempotent, meaning
  # if you run it twice it will error out on attempting to insert records that already exist
  defp load_plugins(client) do
    with {:ok, plugins_info} <-
           Client.list_plugins(client) do
      # load the plugins into the local operations DB - we'll fetch them again in the next step
      {_statuses, plugins} =
        plugins_info
        |> Enum.map(fn plugin -> Datum.Plugins.create_plugin(plugin) end)
        |> Enum.unzip()

      if plugins |> Enum.count(fn plugin -> plugin == %Ecto.Changeset{} end) > 0 do
        IO.puts(
          "Not all plugins could be loaded from the remote server. Functionality may be degraded"
        )
      end
    else
      _ ->
        IO.puts(
          "Unable to fetch or sync either the current user for the token, or plugins - scan will proceed but will not be synced and functionality will be degraded"
        )
    end
  end
end
