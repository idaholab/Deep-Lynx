defmodule Datum.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    case Burrito.Util.Args.argv() do
      ["scan" | paths] ->
        children = [
          DatumWeb.Telemetry,
          Datum.Repo,
          {Datum.Scanners.Filesystem, paths},
          {Task.Supervisor, name: Datum.TaskSupervisor}
        ]

        # See https://hexdocs.pm/elixir/Supervisor.html
        # for other strategies and supported options
        opts = [strategy: :one_for_one, name: Datum.Supervisor]
        Supervisor.start_link(children, opts)

      ["server" | _options] ->
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

      _ ->
        IO.puts("must include an option")
        System.halt(1)
    end
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    DatumWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
