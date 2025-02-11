defmodule Datum.Scanners.Filesystem do
  @moduledoc """
  Filesystem scanner is the primary scanning tool used by the CLI when on a local
  system. Feed it the root path and it will recursively run through the contained
  folders/files and run all enabled plugins on them.
  """
  use Task
  require Logger
  alias Datum.DataOrigin
  alias Datum.Plugins
  alias Datum.DataOrigin.Origin
  alias Datum.DataOrigin.Data
  alias Datum.Plugins.Extractor
  alias Datum.Plugins.Sampler
  alias Datum.Accounts.User

  def scan_directory(origin, user, parent, root_path, opts \\ [])

  @doc """
  This version of scan_directory accepts an Origin record and assumes
  that, because it's not just an Origin ID - that we're running this 
  on the server and have direct access to the filesystem in question
  """
  def scan_directory(%Origin{} = origin, %User{} = user, dir_parent, root_path, opts) do
    {:ok, parent} =
      DataOrigin.add_data(origin, user, %{
        path: root_path,
        original_path: Path.absname(root_path),
        type: :directory,
        owned_by: user.id
      })

    ## we have to make the original leaf node
    DataOrigin.connect_data(origin, dir_parent, parent)

    File.ls!(root_path)
    |> Enum.each(fn entry ->
      full_path = Path.join(root_path, entry)

      if File.dir?(full_path),
        do: scan_directory(origin, user, parent, full_path, opts),
        else: scan_file(origin, user, parent, full_path, opts)
    end)
  end

  def scan_directory(origin_id, user_id, _parent, root_path, opts) do
    {:ok, parent} =
      DatumWeb.SocketClient.send_data(origin_id, user_id, %Data{
        path: root_path,
        original_path: Path.absname(root_path),
        type: :directory
      })

    # unlike above, we can't connect the data here - we rely on the server
    # to connect the data based on path name, so we just start the scan
    File.ls!(root_path)
    |> Enum.each(fn entry ->
      full_path = Path.join(root_path, entry)

      if File.dir?(full_path),
        do: scan_directory(origin_id, user_id, full_path, opts),
        else: scan_file(origin_id, user_id, parent, full_path, opts)
    end)
  end

  @doc """
  scan_file scans a file in the directory and runs all the plugins against it and emits to 
  the database
  """
  def scan_file(origin, user, parent, path, opts \\ [])

  def scan_file(%Origin{} = origin, %User{} = user, parent, path, opts) do
    generate_checksum = Keyword.get(opts, :generate_checksum, false)
    skip_plugins = Keyword.get(opts, :skip_plugins, false)
    extensions = MIME.from_path(path) |> MIME.extensions()

    metadatas =
      if !skip_plugins do
        # This works because the Scan CLI process will build a local copy of the
        # operations database with the plugins owned by the user
        plugins = Plugins.list_plugins_by_extensions([Path.extname(path) | extensions])

        statuses =
          Task.Supervisor.async_stream_nolink(
            Datum.TaskSupervisor,
            plugins,
            fn plugin ->
              case plugin.plugin_type do
                :extractor -> Extractor.plugin_extract(plugin, path)
                :sampler -> Sampler.plugin_sample(plugin, path)
              end
            end,
            on_timeout: :kill_task,
            timeout: 300_000,
            ordered: false,
            max_concurrency: 8
          )
          |> Enum.map(fn
            {:ok, metadata} ->
              {:ok, metadata}

            {:exit, reason} ->
              {:error, "plugin run task exited: #{Exception.format_exit(reason)}"}
          end)

        statuses
        |> Enum.filter(&match?({:error, _}, &1))
        |> Enum.each(fn {:error, message} -> Logger.error(message) end)

        {_s, metadatas} = statuses |> Enum.filter(&match?({:ok, _}, &1)) |> Enum.unzip()

        metadatas
      end

    {checksum_type, checksum} =
      if generate_checksum do
        generate_checksum(path)
      else
        {:none, nil}
      end

    {:ok, child} =
      DataOrigin.add_data(origin, user, %{
        path: path,
        type: :file,
        properties: %{plugin_generated_metadata: metadatas},
        owned_by: user.id,
        checksum: checksum,
        checksum_type: checksum_type,
        original_path: Path.absname(path)
      })

    if parent do
      DataOrigin.connect_data(origin, parent, child)
    else
      {:ok, dir} =
        DataOrigin.add_data(origin, user, %{
          path: Path.dirname(path),
          type: :directory,
          original_path: Path.absname(path)
        })

      DataOrigin.connect_data(origin, dir, child)
    end
  end

  def scan_file(origin_id, user_id, _parent, path, opts) do
    generate_checksum = Keyword.get(opts, :generate_checksum, false)
    extensions = MIME.from_path(path) |> MIME.extensions()

    # This works because the Scan CLI process will build a local copy of the
    # operations database with the plugins owned by the user
    plugins = Plugins.list_plugins_by_extensions([Path.extname(path) | extensions])

    statuses =
      Task.Supervisor.async_stream_nolink(
        Datum.TaskSupervisor,
        plugins,
        fn plugin ->
          case plugin.type do
            :extractor -> Extractor.plugin_extract(plugin, path)
            :sampler -> {:error, "sampler plugins not yet supported"}
          end
        end,
        on_timeout: :kill_task,
        timeout: 30_000,
        ordered: false,
        max_concurrency: 8
      )
      |> Enum.map(fn
        {:ok, metadata} -> {:ok, metadata}
        {:exit, reason} -> {:error, "plugin run task exited: #{Exception.format_exit(reason)}"}
      end)

    statuses
    |> Enum.filter(&match?({:error, _}, &1))
    |> Enum.each(fn {:error, message} -> Logger.error(message) end)

    {_s, metadatas} = statuses |> Enum.filter(&match?({:ok, _}, &1)) |> Enum.unzip()

    {checksum_type, checksum} =
      if generate_checksum do
        generate_checksum(path)
      else
        {:none, nil}
      end

    {:ok, _child} =
      DatumWeb.SocketClient.send_data(origin_id, user_id, %Data{
        path: path,
        original_path: Path.absname(path),
        type: :file,
        properties: %{plugin_generated_metadata: metadatas},
        owned_by: user_id,
        checksum: checksum,
        checksum_type: checksum_type
      })

    # we run a check to see if we can convert this to a duckdb DataOrigin 
    if Path.extname(path) in [".duckdb", "duck", "duck_db"] do
    end
  end

  defp generate_checksum(path) do
    {:crc32,
     File.stream!(path, 2048, [])
     |> Enum.reduce(0, fn line, acc -> :crc32cer.nif(acc, line) end)
     |> to_string()}
  end
end
