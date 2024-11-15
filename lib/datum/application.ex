defmodule Datum.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    case Burrito.Util.Args.argv() do
      ["help" | args] ->
        help(args)
        System.halt(0)

      ["init" | args] ->
        :ok = init(args)
        IO.puts("Successfully wrote configuration file.")
        System.halt(0)

      ["scan" | args] ->
        children = [
          Datum.Repo,
          {Datum.Scan, args},
          # the task supervisor is for the file scan tasks generated
          # by the scanner
          {Task.Supervisor, name: Datum.TaskSupervisor}
        ]

        # See https://hexdocs.pm/elixir/Supervisor.html
        # for other strategies and supported options
        opts = [strategy: :one_for_one, name: Datum.Supervisor]
        Supervisor.start_link(children, opts)

      ["server" | _args] ->
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
          {Task.Supervisor, name: Datum.TaskSupervisor}
        ]

        # See https://hexdocs.pm/elixir/Supervisor.html
        # for other strategies and supported options
        opts = [strategy: :one_for_one, name: Datum.Supervisor]
        Supervisor.start_link(children, opts)

      # for now, fallback to the default setup for the testing environment or if
      # they run with no arguments
      _ ->
        children = [
          DatumWeb.Telemetry,
          Datum.Repo,
          {DNSCluster, query: Application.get_env(:datum, :dns_cluster_query) || :ignore},
          {Phoenix.PubSub, name: Datum.PubSub},
          # Start the Finch HTTP client for sending emails
          {Finch, name: Datum.Finch},
          # Start a worker by calling: Datum.Worker.start_link(arg)
          # {Datum.Worker, arg},
          # Start to serve requests, typically the last entry
          DatumWeb.Endpoint,
          {Task.Supervisor, name: Datum.TaskSupervisor}
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
        Prompt.text("Please enter the URL for the central Datum server you wish to use:")
      end

    token =
      Keyword.get(parsed, :token)

    token =
      if token do
        token
      else
        Prompt.text("Please enter your Personal Access Token (PAT):")
      end

    File.write(
      Path.join(System.user_home(), ".datum-config"),
      Ymlr.document!(%{endpoint: endpoint, token: token})
    )
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
end
