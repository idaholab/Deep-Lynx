defmodule Datum.Plugins.TdmsIndex do
  @moduledoc """
  General metadata extraction for TDMS index files
  """
  @behaviour Datum.Plugins.Extractor

  @impl true
  def extract(path, opts \\ []) do
    {:ok, TDMS.Parser.parse_index(File.read!(path))}
  end
end
