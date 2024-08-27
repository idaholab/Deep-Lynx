defmodule Datum.Plugins.Extractor do
  @moduledoc """
  Run is in charge of loading the WASM modules from the Plugin schema and
  running the WASI runtime. Keep in mind that we should try and limit how
  often we compile the module, but we still need to start a genserver each time
  in order to limit file visibility.
  """

  alias Datum.Plugins.Plugin

  def extract(%Plugin{} = plugin, path, _opts \\ []) do
    {:ok, stderr} = Wasmex.Pipe.new()
    {:ok, stdout} = Wasmex.Pipe.new()

    wasi_options = %Wasmex.Wasi.WasiOptions{
      preopen: [%Wasmex.Wasi.PreopenOptions{path: Path.dirname(path), alias: "temp"}],
      env: %{"FILE_NAME" => Path.basename(path)},
      stderr: stderr,
      stdout: stdout
    }

    bytes =
      if plugin.path do
        File.read!(plugin.path)
      else
        plugin.module
      end

    with {:ok, pid} <- Wasmex.start_link(%{bytes: bytes, wasi: wasi_options}),
         {:ok, []} <- Wasmex.call_function(pid, :extract, []) do
      Wasmex.Pipe.seek(stdout, 0)

      Jason.decode(Wasmex.Pipe.read(stdout))
    else
      _ ->
        Wasmex.Pipe.seek(stderr, 0)
        {:error, Wasmex.Pipe.read(stderr)}
    end
  end
end
