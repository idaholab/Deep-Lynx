defmodule Datum.Plugins.CSV do
  @moduledoc """
  General metadata extraction for Parquet files
  """
  @behaviour Datum.Plugins.Extractor

  @impl true
  def extract(path, opts \\ []) do
    delimiter = Keyword.get(opts, :delimiter, ",")

    # it's kind of dumb how easy the extraction is for csv files (granted we let everything else handle it)
    # we take it and convert it into a ExplorerDataFrame and use the resulting frames data structure as our result
    # eventually we might change this to be a common metadata structure, but we'll see
    # note that we cannot use lazy on csv files unfortunately
    case Explorer.DataFrame.from_csv(path, lazy: false, delimiter: delimiter) do
      {:ok, df} -> {:ok, df.dtypes()}
      {:error, message} -> {:error, message}
    end
  end
end
