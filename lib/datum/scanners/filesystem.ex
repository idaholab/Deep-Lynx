defmodule Datum.Scanners.Filesystem do
  @moduledoc """
  Filesystem scanner is the primary scanning tool used by the CLI when on a local
  system. Feed it the root path and it will recursively run through the contained
  folders/files and run all enabled plugins on them.

  Note: we will need extensive work on this in order to more intelligently load
  plugins based on the directory. As we can only limit the WASM plugin to the directory
  not a single file, we can at least not recompile the plugin each time it needs to be
  used.
  """
  use Task
  require Logger
  alias Datum.DataOrigin
  alias Datum.Plugins
  alias Datum.DataOrigin.Origin
  alias Datum.DataOrigin.Data
  alias Datum.Plugins.Extractor

  # we are treating this module as a SupervisedTask to be run, allowing us to run concurrently
  # and not have a crash here crash the parent process
  def start_link(arg) do
    Task.start_link(__MODULE__, :run, [arg])
  end

  # TODO: finish hooking this up
  def run(_args) do
    Prompt.display("BOB")
    Prompt.text("TEST")
  end

  def scan_directory(%Origin{} = origin, root_path, user_id \\ nil) do
    {:ok, parent} =
      DataOrigin.add_data(origin, %{
        path: root_path,
        type: :directory,
        owned_by: user_id
      })

    ## we have to make the original leaf node
    DataOrigin.connect_data(origin, parent, parent)

    File.ls!(root_path)
    |> Enum.each(fn entry ->
      full_path = Path.join(root_path, entry)

      if File.dir?(full_path),
        do: scan_directory(origin, full_path, user_id),
        else: act_on_file(origin, parent, full_path, user_id)
    end)
  end

  defp act_on_file(%Origin{} = origin, %Data{} = parent, path, user_id) do
    mimetype = MIME.from_path(path)

    # TODO: this won't work duh, because the origin isn't here - we need to either make a call out or load in
    # somehow
    plugins = Plugins.list_plugins_by_extensions([mimetype])

    statuses =
      Task.Supervisor.async_stream_nolink(
        Datum.TaskSupervisor,
        plugins,
        fn plugin ->
          case plugin.type do
            :extractor -> Extractor.extract(plugin, path)
            :sampler -> {:error, "sampler plugins not yet supported"}
          end
        end,
        on_timeout: :kill_task,
        ordered: false,
        max_concurrency: 8
      )
      |> Stream.map(fn
        {:ok, metadata} -> {:ok, metadata}
        {:exit, reason} -> {:error, "plugin run task exited: #{Exception.format_exit(reason)}"}
      end)

    statuses
    |> Enum.filter(&match?({:error, _}, &1))
    |> Enum.each(fn {:error, message} -> Logger.error(message) end)

    {_s, metadatas} = statuses |> Enum.filter(&match?({:ok, _}, &1)) |> Enum.unzip()

    {:ok, child} =
      DataOrigin.add_data(origin, %{
        path: path,
        type: :file,
        metadata: %{plugin_generated_metadata: metadatas},
        owned_by: user_id
      })

    DataOrigin.connect_data(origin, parent, child)
  end
end
