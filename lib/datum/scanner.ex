defmodule Datum.Scanner do
  @moduledoc """
  This is a GenServer in charge of running scan processes from the CLI.  
  If you are wanting the server or other processes to run scanning - prefer using the scanner you
  need directly.
  """
  use GenServer
  require Logger
  alias DatumWeb.Client

  def start_link(state) do
    GenServer.start_link(
      __MODULE__,
      state,
      name: __MODULE__
    )
  end

  def scan(origin, dirs, opts \\ []) do
    GenServer.call(__MODULE__, {:scan, origin, dirs, opts})
  end

  # Server
  @impl true
  def init(state) do
    {:ok, state}
  end

  @impl true
  def handle_call({:scan, origin, directories, opts}, _from, state) do
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
end
