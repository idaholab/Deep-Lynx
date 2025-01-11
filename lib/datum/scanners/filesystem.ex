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
  alias Datum.Accounts.User

  @doc """
  This version of scan_directory accepts an Origin record and assumes
  that, because it's not just an Origin ID - that we're running this 
  on the server and have direct access to the filesystem in question
  """
  def scan_directory(%Origin{} = origin, %User{} = user, root_path, opts \\ []) do
    {:ok, parent} =
      DataOrigin.add_data(origin, user, %{
        path: root_path,
        type: :directory,
        owned_by: Keyword.get(opts, :user_id)
      })

    ## we have to make the original leaf node
    DataOrigin.connect_data(origin, parent, parent)

    File.ls!(root_path)
    |> Enum.each(fn entry ->
      full_path = Path.join(root_path, entry)

      if File.dir?(full_path),
        do: scan_directory(origin, user, full_path, opts),
        else: act_on_file(origin, user, parent, full_path, opts)
    end)
  end

  defp act_on_file(%Origin{} = origin, %User{} = user, %Data{} = parent, path, opts) do
    generate_checksum = Keyword.get(opts, :generate_checksum, false)
    user_id = Keyword.get(opts, :user_id)
    extensions = MIME.from_path(path) |> MIME.extensions()

    # This works because the Scan CLI process will build a local copy of the
    # operations database with the plugins owned by the user
    plugins = Plugins.list_plugins_by_extensions(extensions)

    statuses =
      Task.Supervisor.async_stream_nolink(
        Datum.TaskSupervisor,
        plugins,
        fn plugin ->
          case plugin.type do
            :extractor -> Extractor.extract_with_plugin(plugin, path)
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

    {:ok, child} =
      DataOrigin.add_data(origin, user, %{
        path: path,
        type: :file,
        metadata: %{plugin_generated_metadata: metadatas},
        owned_by: user_id,
        checksum: checksum,
        checksum_type: checksum_type
      })

    DataOrigin.connect_data(origin, parent, child)
  end

  defp generate_checksum(path) do
    {:crc32,
     File.stream!(path, 2048, [])
     |> Enum.reduce(0, fn line, acc -> :crc32cer.nif(acc, line) end)
     |> to_string()}
  end
end
