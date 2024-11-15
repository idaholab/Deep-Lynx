defmodule Datum.Scan do
  @moduledoc """
  This is the process in charge of scanning - called almost exclusively from the CLI. If
  you are wanting the server or other processes to run scanning - prefer using the scanner you
  need directly.
  """
  require Logger

  def run(_args) do
    # run the migrations and open a read/write connection to local ops db
    # this is needed in case there are any updates to the CLI and ops central db
    IO.puts("Running migrations for operations database")
    {:ok, _, _} = Ecto.Migrator.with_repo(Datum.Repo, &Ecto.Migrator.run(&1, :up, all: true))
    IO.puts("Migrations complete")

    # sync the local operations database with the cloud one
    # pull the user record, and download the shared plugins

    # start a supervised task for each of the paths passed in from the args
    # logging will inform the user of any issues etc.
    :ok
  end
end
