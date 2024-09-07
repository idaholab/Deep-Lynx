defmodule Datum.Plugins.Extractor do
  @moduledoc """
  Run is in charge of loading the WASM modules from the Plugin schema and
  running the WASI runtime. Keep in mind that we should try and limit how
  often we compile the module, but we still need to start a genserver each time
  in order to limit file visibility to the directory where the file is at.

  In time the pipeline running this should be intelligent enough to run all loaded scanners
  for the directory instead of recompiling for each one.
  """

  alias Datum.Plugins.Plugin

  def extract(%Plugin{} = plugin, path, _opts \\ []) do
    {:ok, stderr} = Wasmex.Pipe.new()
    {:ok, stdout} = Wasmex.Pipe.new()

    # we must document the file location and name for the receiving WASM function - we do
    # things this way because WASM only lets us use integers for function calls, and dealing
    # with pointers from Elixir -> WASM is a bitch
    wasi_options = %Wasmex.Wasi.WasiOptions{
      preopen: [%Wasmex.Wasi.PreopenOptions{path: Path.dirname(path), alias: "temp"}],
      env: %{"FILE_NAME" => Path.basename(path)},
      # we use these pipes to capture the output - instead of reading memory from a returned pointer. The reason
      # being that multivalue returns aren't yet fully supported in WASM, and without a limit, we could over or under
      # read the memory buffer causing issues. Safer to have the WASM function output JSON or binary we have to parse.
      stderr: stderr,
      stdout: stdout
    }

    # we're either storing the raw bytes of the plugin in the db, or it's on the filesystem because it's a default or
    # datum provided plugin
    bytes =
      if plugin.path do
        File.read!(plugin.path)
      else
        plugin.module
      end

    with {:ok, pid} <- Wasmex.start_link(%{bytes: bytes, wasi: wasi_options}),
         {:ok, []} <- Wasmex.call_function(pid, :extract, []) do
      Wasmex.Pipe.seek(stdout, 0)

      # works fairly well, malformed data won't be read and therefore cannot break out of the system easily
      Jason.decode(Wasmex.Pipe.read(stdout))
    else
      _ ->
        Wasmex.Pipe.seek(stderr, 0)
        {:error, Wasmex.Pipe.read(stderr)}
    end
  end
end
