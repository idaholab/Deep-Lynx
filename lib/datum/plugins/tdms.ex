require Protocol
Protocol.derive(Jason.Encoder, TDMS.File)
Protocol.derive(Jason.Encoder, TDMS.Property)
Protocol.derive(Jason.Encoder, TDMS.Channel)
Protocol.derive(Jason.Encoder, TDMS.Group)

defmodule Datum.Plugins.Tdms do
  @moduledoc """
  General metadata extraction for TDMS index files
  """
  @behaviour Datum.Plugins.Extractor

  @impl true
  def extract(path, _opts \\ []) do
    # if we are an index file, or one exists, use the parse_index function as it's faster than reading the whole file
    if String.contains?(Path.extname(path), "_index") or File.exists?("#{path}_index") do
      case TDMS.Parser.parse_index(File.read!(path)) do
        {:error, message} -> {:error, message}
        file -> {:ok, file}
      end
    else
      case TDMS.Parser.parse(File.read!(path)) do
        {:error, message} -> {:error, message}
        file -> {:ok, file}
      end
    end
  end
end
