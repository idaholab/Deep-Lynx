defmodule Mix.Tasks.Database.Clean do
  @moduledoc """
  Cleans the local database files.
  """

  @shortdoc "Removes all databases files"

  use Mix.Task

  @impl Mix.Task
  def run(_args) do
    File.rm_rf!(Application.get_env(:datum, :origin_db_path))
    File.rm_rf!(Application.get_env(:datum, Datum.Repo)[:database])
    File.rm_rf!("#{Application.get_env(:datum, Datum.Repo)[:database]}-shm")
    File.rm_rf!("#{Application.get_env(:datum, Datum.Repo)[:database]}-wal")
  end
end
