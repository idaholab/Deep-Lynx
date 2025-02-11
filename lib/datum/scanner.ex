defmodule Datum.Scanner do
  @moduledoc """
  This is a GenServer in charge of running scan processes against a DataOrigin. Currently
  works with :filesystem origins and can work either being started by the server or the CLI 
  depending on the data structures pushed into it.
  """
  use GenServer
  require Logger
  alias Datum.Scanners.Filesystem
  alias Datum.DataOrigin
  alias Datum.DataOrigin.Origin

  def start_link(state, opts \\ []) do
    if Keyword.get(opts, :name) do
      GenServer.start_link(
        __MODULE__,
        state,
        name: Keyword.get(opts, :name)
      )
    else
      GenServer.start_link(
        __MODULE__,
        state,
        name: __MODULE__
      )
    end
  end

  def scan(origin, dirs, opts \\ []) do
    GenServer.call(Keyword.get(opts, :name, __MODULE__), {:scan, origin, dirs, opts})
  end

  def watch(origin, opts \\ []) do
    GenServer.call(Keyword.get(opts, :name, __MODULE__), {:watch, origin, opts})
  end

  # Server
  @doc """
  Initialize function for the scanning of a DuckDB origin.
  """
  @impl true
  def init(%{origin: %Origin{type: :duckdb} = origin} = state) do
    # if we can't find the file, we don't want to crash the supervisor - so we instead
    # return :ignore so that we simply don't start the watchers or scans or anything
    if !File.exists?(origin.config["path"]) do
      :ignore
    else
      if Map.get(state, :scan_on_start) do
        Datum.Scanners.DuckDB.scan(origin)
        IO.puts("Scan Finished")
      end

      if Map.get(state, :watch) do
        {:ok, pid} = FileSystem.start_link(dirs: [Path.dirname(origin.config["path"])])
        FileSystem.subscribe(pid)

        {:ok,
         state
         |> Map.put(:watcher_pid, pid)}
      else
        {:ok, state}
      end
    end
  end

  # init for fallback origins or filesystem scanner origins
  @impl true
  def init(state) do
    if Map.get(state, :scan_on_start) do
      Task.Supervisor.async_stream_nolink(
        Datum.TaskSupervisor,
        [state.origin.config["path"]],
        fn dir ->
          # we need to for sure create the root_directory so we get the data attached to the right thing
          {:ok, parent} =
            DataOrigin.add_data(state.origin, state.user, %{
              path: dir,
              original_path: Path.absname(dir),
              type: :root_directory,
              owned_by: state.user.id
            })

          DataOrigin.connect_data(state.origin, parent, parent)

          Datum.Scanners.Filesystem.scan_directory(
            state.origin,
            state.user,
            parent,
            dir,
            generate_checksum: false,
            skip_plugins: true
          )
        end,
        timeout: :infinity,
        ordered: false,
        max_concurrency: 8
      )
      |> Enum.each(fn _result -> IO.puts("Finished scan") end)
    end

    if Map.get(state, :watch) do
      {:ok, pid} = FileSystem.start_link(dirs: [Map.get(state, :origin).config["path"]])
      FileSystem.subscribe(pid)

      {:ok,
       state
       |> Map.put(:watcher_pid, pid)}
    else
      {:ok, state}
    end
  end

  @doc """
  The handler for a duckdb watcher - just a different way to get what path to watch out
  """
  @impl true
  def handle_call({:watch, %Origin{type: :duckdb} = origin, opts}, _from, state) do
    {:ok, pid} =
      FileSystem.start_link(
        dirs: [Keyword.get(opts, :directories, origin.config["path"] |> Path.dirname())]
      )

    FileSystem.subscribe(pid)

    {:reply, pid,
     state
     |> Map.put(:watcher_pid, pid)
     |> Map.put(:origin, origin)
     |> Map.put(:opts, opts)}
  end

  @impl true
  def handle_call({:watch, origin, opts}, _from, state) do
    {:ok, pid} =
      FileSystem.start_link(dirs: Keyword.get(opts, :directories, [origin["config"]["path"]]))

    FileSystem.subscribe(pid)

    {:reply, pid,
     state
     |> Map.put(:watcher_pid, pid)
     |> Map.put(:origin, origin)
     |> Map.put(:opts, opts)}
  end

  # if we have a full origin record, we're assuming we're running as part of the server process
  @impl true
  def handle_call({:scan, %Origin{} = origin, directories, opts}, _from, state) do
    # start a supervised task for each of the paths passed in from the args
    # logging will inform the user of any issues etc. It should be it's own
    # origin - but one origin that contains each of these paths as :root_directory
    Task.Supervisor.async_stream_nolink(
      Datum.TaskSupervisor,
      directories,
      fn dir ->
        # we need to for sure create the root_directory so we get the data attached to the right thing
        {:ok, parent} =
          DataOrigin.add_data(origin, state.user, %{
            path: dir,
            original_path: Path.absname(dir),
            type: :root_directory,
            owned_by: state.user.id
          })

        DataOrigin.connect_data(origin, parent, parent)

        Datum.Scanners.Filesystem.scan_directory(
          origin,
          state.user,
          parent,
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
  def handle_call({:scan, origin, directories, opts}, _from, state) do
    # start a supervised task for each of the paths passed in from the args
    # logging will inform the user of any issues etc. It should be it's own
    # origin - but one origin that contains each of these paths as :root_directory
    Task.Supervisor.async_stream_nolink(
      Datum.TaskSupervisor,
      directories,
      fn dir ->
        # we need to for sure create the root_directory so we get the data attached to the right thing
        {:ok, root} =
          DatumWeb.Client.create_data!(state.client, origin, %Datum.DataOrigin.Data{
            path: dir,
            type: :root_directory
          })

        Datum.Scanners.Filesystem.scan_directory(
          origin,
          state.user,
          root,
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
  def handle_info(
        {:file_event, watcher_pid, {_path, events}},
        %{watcher_pid: watcher_pid, origin: %Origin{type: :duckdb} = origin} = state
      ) do
    cond do
      Enum.any?(events, &(&1 == :created || &1 == :modified || &1 == :moved_to || &1 == :closed)) ->
        Datum.Scanners.DuckDB.scan(origin)
        {:noreply, state}

      Enum.any?(events, &(&1 == :deleted || &1 == :moved_to)) ->
        {:stop, :database_deleted_or_moved, state}
    end
  end

  @impl true
  def handle_info({:file_event, watcher_pid, {path, events}}, %{watcher_pid: watcher_pid} = state) do
    cond do
      Enum.any?(events, &(&1 == :isdir)) &&
          Enum.any?(events, &(&1 == :created || &1 == :modified || &1 == :moved_to)) ->
        Filesystem.scan_directory(state.origin, state.user, nil, path)

      Enum.any?(events, &(&1 == :created || &1 == :modified || &1 == :moved_to || &1 == :closed)) ->
        Filesystem.scan_file(state.origin, state.user, nil, path)

      Enum.any?(events, &(&1 == :deleted || &1 == :moved_to)) ->
        {:ok, _file} = DatumWeb.SocketClient.remove_data(state.origin, path)
    end

    {:noreply, state}
  end

  @impl true
  def handle_info({:file_event, watcher_pid, :stop}, %{watcher_pid: watcher_pid} = _state) do
    {:stop, :watcher_terminated}
  end
end
