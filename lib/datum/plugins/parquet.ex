defmodule Datum.Plugins.Parquet do
  @moduledoc """
  General metadata extraction for Parquet files
  """
  @behaviour Datum.Plugins.Extractor

  @impl true
  def extract(path, _opts \\ []) do
    # it's kind of dumb how easy the extraction is for parquet files (granted we let everything else handle it)
    # we take it and convert it into a ExplorerDataFrame and use the resulting frames data structure as our result
    # eventually we might change this to be a common metadata structure, but we'll see
    case Explorer.DataFrame.from_parquet(path, lazy: true) do
      {:ok, df} -> {:ok, df.dtypes()}
      {:error, message} -> {:error, message}
    end
  end
end
