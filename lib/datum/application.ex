defmodule Datum.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application
  alias DatumWeb.Client

  @impl true
  def start(_type, _args) do
    # we read in the user arguments using the utility function, cutting the first argument
    # and acting accordingly - no argument should start the server
    case Burrito.Util.Args.argv() do
      ["help" | args] ->
        help(args)
        System.halt(0)

      ["init" | args] ->
        init(args)
        System.halt(0)

      ["seed" | args] ->
        children = [
          Datum.Repo,
          # we have to include the endpoint so we can generate the admin PAT required for
          # some of the seeds
          DatumWeb.Endpoint
        ]

        # See https://hexdocs.pm/elixir/Supervisor.html
        # for other strategies and supported options
        {:ok, _pid} =
          Supervisor.start_link(children, strategy: :one_for_one, name: Datum.Supervisor)

        {options, _rest, _invalid} =
          args |> OptionParser.parse(strict: [name: :string])

        Datum.Release.migrate()
        Datum.Release.seed_db(Keyword.get(options, :name, "default"))
        IO.puts("System Migrated")
        System.halt(0)

      ["scan" | args] ->
        children = [
          Datum.Repo,
          # the task supervisor is for the file scan tasks generated
          # by the scanner
          {Task.Supervisor, name: Datum.TaskSupervisor}
        ]

        # See https://hexdocs.pm/elixir/Supervisor.html
        # for other strategies and supported options
        {:ok, _pid} =
          Supervisor.start_link(children, strategy: :one_for_one, name: Datum.Supervisor)

        # run the migrations and open a read/write connection to local ops db
        # this is needed in case there are any updates to the CLI and ops central db
        {:ok, _, _} = Ecto.Migrator.with_repo(Datum.Repo, &Ecto.Migrator.run(&1, :up, all: true))

        # fetch the directories from the args, and options
        {options, directories, _invalid} =
          args |> OptionParser.parse(switches: [checksum: :boolean, watch: :boolean])

        # read the configuration file
        {:ok, %{"endpoint" => endpoint, "token" => token} = _config} =
          YamlElixir.read_from_file(Path.join(System.user_home(), ".datum_config"))

        # sync the local operations database with the cloud one for the records we need
        # The reason we're building a local ops db at all is primarily for using plugins
        # this allows us to reuse a bunch of code easily

        # connect the HTTP client
        {:ok, client} =
          Client.new(endpoint, token: token)

        # connect the websocket client, don't need the PID because we register locally by module name
        {:ok, _pid} =
          DatumWeb.SocketClient.start_link(%{
            endpoint: endpoint,
            token: token
          })

        # fetch the current set of plugins 
        load_plugins(client)

        # figure out what Origin we're working with
        {:ok, origin} = load_or_create_origin(client)

        # start the scanning GenServer
        {:ok, _pid} =
          Datum.Scanner.start_link(%{client: client, user: Client.current_user_info!(client)})

        # run the initial scan - this is run regardless of watch status so that
        # we always start from the latest version of the origin before we start sending
        # any updates
        Datum.Scanner.scan(origin, directories, options)

        if Keyword.get(options, :watch) do
          # monitor allows us to keep the CLI running while the monitor is taking place
          # we monitor not the genserver - but the PID returned from the filewatcher
          # representing the watcher service - that way if the watch dies we die
          #
          # https://hexdocs.pm/elixir/1.18.1/Process.html#monitor/1

          pid = Datum.Scanner.watch(origin, directories, options)

          IO.puts("Starting filesystem watcher for #{directories}")
          Process.monitor(pid)

          receive do
            {:DOWN, _ref, :process, object, _reason} ->
              if object == pid do
                System.halt(0)
              end
          end
        end

        System.halt(0)

      ["server" | _args] ->
        Datum.Release.migrate()

        children = [
          DatumWeb.Telemetry,
          Datum.Repo,
          Datum.Search,
          {DNSCluster, query: Application.get_env(:datum, :dns_cluster_query) || :ignore},
          {Phoenix.PubSub, name: Datum.PubSub},
          # Start the Finch HTTP client for sending emails
          {Finch, name: Datum.Finch},
          # Start a worker by calling: Datum.Worker.start_link(arg)
          # {Datum.Worker, arg},
          # Start to serve requests, typically the last entry
          DatumWeb.Endpoint,
          {Task.Supervisor, name: Datum.TaskSupervisor},
          # this registry lets DatumWeb.HomeLive act as a broker and handle message passing between tabs
          {Registry, keys: :unique, name: DatumWeb.TabRegistry}
        ]

        # See https://hexdocs.pm/elixir/Supervisor.html
        # for other strategies and supported options
        opts = [strategy: :one_for_one, name: Datum.Supervisor]
        Supervisor.start_link(children, opts)

      # for now, fallback to the default setup for the testing environment or if
      # they run with no arguments
      _ ->
        Datum.Release.migrate()

        children = [
          DatumWeb.Telemetry,
          Datum.Repo,
          Datum.Search,
          {DNSCluster, query: Application.get_env(:datum, :dns_cluster_query) || :ignore},
          {Phoenix.PubSub, name: Datum.PubSub},
          # Start the Finch HTTP client for sending emails
          {Finch, name: Datum.Finch},
          # Start a worker by calling: Datum.Worker.start_link(arg)
          # {Datum.Worker, arg},
          # Start to serve requests, typically the last entry
          DatumWeb.Endpoint,
          {Task.Supervisor, name: Datum.TaskSupervisor},
          # this registry lets DatumWeb.HomeLive act as a broker and handle message passing between tabs
          {Registry, keys: :unique, name: DatumWeb.TabRegistry}
        ]

        # See https://hexdocs.pm/elixir/Supervisor.html
        # for other strategies and supported options
        opts = [strategy: :one_for_one, name: Datum.Supervisor]
        Supervisor.start_link(children, opts)
    end
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    DatumWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp init(args) do
    {parsed, _rest, _invalid} =
      args |> OptionParser.parse(switches: [endpoint: :string, token: :string])

    endpoint =
      Keyword.get(
        parsed,
        :endpoint
      )

    endpoint =
      if endpoint do
        endpoint
      else
        Prompt.text("Please enter the URL for the central Datum server you wish to use")
      end

    token =
      Keyword.get(parsed, :token)

    token =
      if token do
        token
      else
        Prompt.text("Please enter your Personal Access Token (PAT)")
      end

    :ok =
      File.write(
        Path.join(System.user_home(), ".datum_config"),
        Ymlr.document!(%{endpoint: endpoint, token: token})
      )

    IO.puts("Successfully wrote configuration file.")
  end

  defp help(args) do
    case args do
      [] ->
        IO.puts("""
        Datum is a data catalog and command line tool for mapping data and metadata effectively.

        Usage:

            datum <command> [arguments]

        The commands are:

            init        Initialize the Datum CLI and gather necessary config values.
            scan        Scan the given paths and upload the metadata to a central Datum catalog.
            server      Start the Datum central webserver.

        Use datum help <command> to find out more about that command.
        """)

      ["init" | _rest] ->
        IO.puts("""
        usage: datum init [--token] [--endpoint]

        Init will attempt to capture the endpoint and token for your centralized Datum server. If provided
        via the '--token' and '--endpoint' flags, no user interaction will be necessary. Once this is initialized
        the configuration will be written to your home directory in the '.datum-config' file and used for all
        subsequent invocations.
        """)
    end
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
