defmodule Datum.DataOrigin.OriginRepo do
  require Logger
  alias Datum.DataOrigin.Origin

  @moduledoc """
    This is the repo for interacting with DataOrigin's Sqlite3 databases.
    Each Data Origin will have it's own, separate Sqlite3 database and so
    we will use dynamic repositories to work with it.
  """
  use Ecto.Repo, adapter: Ecto.Adapters.SQLite3, otp_app: :datum

  # pass in the data origin's uuid - the PID for the write repo should
  # be a shortened form of it. If it's a read only transaction we simply open
  # up a new connection because why not?
  def with_dynamic_repo(%Origin{} = origin, callback, opts \\ []) do
    # default to readwrite mode because you never know
    mode = Keyword.get(opts, :mode, :readwrite)
    run_migrations = Keyword.get(opts, :run_migrations, true)
    short_uuid = ShortUUID.encode!(origin.id)

    name =
      case mode do
        # if we're in readwrite mode we have to register on the global namespace
        # so we guarantee that only one writer exists to a database at a given time
        # note that you can ONLY write to origin databases through these connections,
        # not through the attached dbs on the operations db
        :readwrite -> {:global, String.to_atom("origindb_#{short_uuid}")}
        _ -> nil
      end

    start_opts = [
      name: name,
      database: origin.database_path,
      journal_mode: :wal,
      mode: mode,
      binary_id_type: :binary,
      auto_vacuum: :incremental,
      datetime_type: :iso8601,
      load_extensions: [
        "./priv/sqlite_extensions/crypto",
        "./priv/sqlite_extensions/fileio",
        "./priv/sqlite_extensions/fuzzy",
        "./priv/sqlite_extensions/math",
        "./priv/sqlite_extensions/stats",
        "./priv/sqlite_extensions/text",
        "./priv/sqlite_extensions/unicode",
        "./priv/sqlite_extensions/uuid",
        "./priv/sqlite_extensions/vec0",
        "./priv/sqlite_extensions/vsv"
      ]
    ]

    # check to see if it's already started, pulling that PID if it is
    repo =
      case Datum.DataOrigin.OriginRepo.start_link(start_opts) do
        {:ok, repo_pid} ->
          repo_pid

        {:error, {:already_started, repo_pid}} ->
          repo_pid

        {:error, reason} ->
          Logger.error("unable to start repo for Data Origin: #{reason}")
          nil
      end

    if repo do
      try do
        # put_dynamic_repo sets this repo PID for the life of the process or until its called again
        Datum.DataOrigin.OriginRepo.put_dynamic_repo(repo)

        # we have to run the migrations for this repo or else we might
        # not have a clean database to work with
        if mode == :readwrite && run_migrations do
          Ecto.Migrator.run(
            Datum.DataOrigin.OriginRepo,
            [Ecto.Migrator.migrations_path(Datum.DataOrigin.OriginRepo)],
            :up,
            all: true
          )
        end

        callback.()
      catch
        value -> {:error, value}
      end
    end
  end
end

defmodule Datum.DataOrigin.CT do
  @moduledoc """
  Needed for the closure_table library. NOTE: You MUST call this only after you've done put_dynamic_repo, either
  yourself or through the function above. If not, you're potentially writing a previous connection's database. I know,
  it's potentially dangerous - but so is breathing.
  """
  use CTE,
    repo: Datum.DataOrigin.OriginRepo,
    nodes: Datum.DataOrigin.Data,
    paths: Datum.DataOrigin.DataTreePath,
    options: %{
      node: %{primary_key: :id, type: :binary},
      paths: %{
        ancestor: [type: :binary],
        descendant: [type: :binary]
      }
    }
end
