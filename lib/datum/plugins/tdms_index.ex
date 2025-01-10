require Protocol
Protocol.derive(Jason.Encoder, TDMS.File)
Protocol.derive(Jason.Encoder, TDMS.Property)
Protocol.derive(Jason.Encoder, TDMS.Channel)
Protocol.derive(Jason.Encoder, TDMS.Group)

defmodule Datum.Plugins.TdmsIndex do
  @moduledoc """
  General metadata extraction for TDMS index files
  """
  @behaviour Datum.Plugins.Extractor

  @impl true
  def extract(path, _opts \\ []) do
    case TDMS.Parser.parse_index(File.read!(path)) do
      {:error, message} -> {:error, message}
      file -> {:ok, file}
    end
  end
end
