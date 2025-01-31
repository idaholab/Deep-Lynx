defmodule Datum.Release do
  @moduledoc """
  Used for executing DB release tasks when run in production without Mix
  installed.
  """
  @app :datum

  alias DatumWeb.Client
  alias VegaLite, as: Vl

  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  def seed_db("tdms") do
    Code.eval_file(Path.join(:code.priv_dir(@app), "repo/tdms_seeds.exs"))
  end

  def seed_db(_default) do
    Code.eval_file(Path.join(:code.priv_dir(@app), "repo/default_seeds.exs"))
  end

  def system_test() do
    IO.puts("Testing for #{:erlang.system_info(:system_architecture)}")
    IO.puts("Testing that we can run vega-lite")

    vl =
      Vl.new(width: 400, height: 400)
      |> Vl.data_from_values(iteration: 1..100, score: 1..100)
      |> Vl.mark(:line)
      |> Vl.encode_field(:x, "iteration", type: :quantitative)
      |> Vl.encode_field(:y, "score", type: :quantitative)

    # Saves graphic to a file
    VegaLite.Convert.save!(vl, "image.png")
    File.rm!("image.png")
    IO.puts("Pass")

    IO.puts("Testing DuckDB")
    File.rm("#{Path.join([Application.app_dir(:datum), "priv", "test_db.duckdb"])}")

    {:ok, _state} =
      Datum.Duckdb.init(%{parent: self()})

    IO.puts("Pass")

    IO.puts("Testing Python Integration")

    {:ok, python_pid} =
      :python.start([{:cd, ~c"#{Path.join([Application.app_dir(:datum), "priv"])}"}])

    IO.puts("Pass")

    IO.puts("Testing Python NPTDMS Integration")

    :python.call(python_pid, :tester, :tdms_test, [
      <<"#{Path.join([Application.app_dir(:datum), "priv", "tester.tdms"])}">>
    ])

    IO.puts("Pass")

    IO.puts("Testing Python DuckDB Integration")
    :python.call(python_pid, :tester, :duckdb_test, [])
    IO.puts("Pass")

    IO.puts("All Tests Pass!")
  end

  def init(args) do
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

  def help(args) do
    case args do
      "" ->
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

      "init" ->
        IO.puts("""
        usage: datum init [--token] [--endpoint]

        Init will attempt to capture the endpoint and token for your centralized Datum server. If provided
        via the '--token' and '--endpoint' flags, no user interaction will be necessary. Once this is initialized
        the configuration will be written to your home directory in the '.datum-config' file and used for all
        subsequent invocations.
        """)
    end
  end

  def seed(seed_file) do
    load_app()

    __MODULE__.migrate()

    children = [
      Datum.Repo
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    {:ok, _pid} =
      Supervisor.start_link(children, strategy: :one_for_one, name: Datum.Supervisor)

    Plug.Crypto.Application.start(:normal, [])

    __MODULE__.seed_db(seed_file)
    IO.puts("System Migrated")
  end

  def scan(args) do
    load_app()

    # run the migrations and open a read/write connection to local ops db
    # this is needed in case there are any updates to the CLI and ops central db
    {:ok, _, _} = Ecto.Migrator.with_repo(Datum.Repo, &Ecto.Migrator.run(&1, :up, all: true))

    # fetch the directories from the args, and options
    {options, directories, _invalid} =
      args
      |> String.split(" ")
      |> OptionParser.parse(switches: [checksum: :boolean, watch: :boolean])

    # read the configuration file
    {:ok, %{"endpoint" => endpoint, "token" => token} = _config} =
      YamlElixir.read_from_file(Path.join([System.user_home(), ".config", ".datum_config.yaml"]))

    # sync the local operations database with the cloud one for the records we need
    # The reason we're building a local ops db at all is primarily for using plugins
    # this allows us to reuse a bunch of code easily

    children = [
      Datum.Repo,
      # the task supervisor is for the file scan tasks generated
      # by the scanner
      {DNSCluster, query: Application.get_env(:datum, :dns_cluster_query) || :ignore},
      # Start the Finch HTTP client for sending emails
      {Finch, name: Req.Finch},
      Slipstream.ConnectionSupervisor,
      {Task.Supervisor, name: Datum.TaskSupervisor}
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    {:ok, _pid} =
      Supervisor.start_link(children, strategy: :one_for_one, name: Datum.Supervisor)

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

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end
