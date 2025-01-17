defmodule Datum.Scanner do
  @moduledoc """
  This is a GenServer in charge of running scan processes from the CLI.  
  If you are wanting the server or other processes to run scanning - prefer using the scanner you
  need directly.
  """
  use GenServer
  require Logger
  alias Datum.Scanners.Filesystem

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

  def watch(origin, dirs, opts \\ []) do
    GenServer.call(__MODULE__, {:watch, origin, dirs, opts})
  end

  # Server
  @impl true
  def init(state) do
    {:ok, state}
  end

  @impl true
  def handle_call({:watch, origin, directories, opts}, _from, state) do
    {:ok, pid} = FileSystem.start_link(dirs: directories)
    FileSystem.subscribe(pid)

    {:reply, pid,
     state
     |> Map.put(:watcher_pid, pid)
     |> Map.put(:origin, origin)
     |> Map.put(:opts, opts)}
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
        # we need to for sure create the root_directory so we get the data attached to the right thing
        DatumWeb.Client.create_data!(state.client, origin["id"], %Datum.DataOrigin.Data{
          path: dir,
          type: :root_directory
        })

        Datum.Scanners.Filesystem.scan_directory(
          origin["id"],
          state.user["id"],
          dir,
          generate_checksum: Keyword.get(opts, :checksum)
        )
      end,
      timeout: :infinity,
      ordered: false,
      max_concurrency: 8
    )
    |> Enum.each(fn _result -> IO.puts("Finished scan") end)

    {:reply, :ok, state}
  end

  @impl true
  def handle_info({:file_event, watcher_pid, {path, events}}, %{watcher_pid: watcher_pid} = state) do
    cond do
      Enum.any?(events, &(&1 == :isdir)) &&
          Enum.any?(events, &(&1 == :created || &1 == :modified || &1 == :moved_to)) ->
        Filesystem.scan_directory(state.origin["id"], state.user["id"], path)

      Enum.any?(events, &(&1 == :created || &1 == :modified || &1 == :moved_to || &1 == :closed)) ->
        Filesystem.scan_file(state.origin["id"], state.user["id"], nil, path)

      Enum.any?(events, &(&1 == :deleted || &1 == :moved_to)) ->
        {:ok, _file} = DatumWeb.SocketClient.remove_data(state.origin["id"], path)
    end

    {:noreply, state}
  end

  @impl true
  def handle_info({:file_event, watcher_pid, :stop}, %{watcher_pid: watcher_pid} = _state) do
    {:stop, :watcher_terminated}
  end
end
