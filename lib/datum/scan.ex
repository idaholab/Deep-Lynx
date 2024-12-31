defmodule Datum.Scan do
  @moduledoc """
  This is the process in charge of scanning - called almost exclusively from the CLI. If
  you are wanting the server or other processes to run scanning - prefer using the scanner you
  need directly.
  """
  require Logger
  alias DatumWeb.Client
  alias Datum.DataOrigin
  alias Datum.Accounts

  @doc """
  run/2 will run the packaged scanners against the provided directories, currently only
  local or mounted network storage locations are supported. Options refer to the various
  options that the scanners have.

  FilesystemScanner - :generate_checksum -> bool - automatically generate a crc32 checksum of the scanned files
  """
  def run(directories, opts \\ []) do
    generate_checksum = Keyword.get(opts, :generate_checksum, false)
    # run the migrations and open a read/write connection to local ops db
    # this is needed in case there are any updates to the CLI and ops central db
    IO.puts("Running migrations for operations database")
    {:ok, _, _} = Ecto.Migrator.with_repo(Datum.Repo, &Ecto.Migrator.run(&1, :up, all: true))
    IO.puts("Migrations complete")

    # sync the local operations database with the cloud one
    # by pulling the user record, and download the shared plugins

    # pull the config file first so we can build a client
    {:ok, %{"endpoint" => endpoint, "token" => token} = _config} =
      YamlElixir.read_from_file(Path.join(System.user_home(), ".datum_config"))

    # the plug environment lets us override where the scan gets its data when testing
    {:ok, client} =
      Client.new(endpoint, token: token, plug: Application.get_env(:datum, :scan_plug))

    {user, _plugins} = load_remote_db(client)
    {:ok, origin} = load_or_create_origin(user)

    # start a supervised task for each of the paths passed in from the args
    # logging will inform the user of any issues etc. It should be it's own
    # origin - but one origin that contains each of these paths as :root_directory
    Task.Supervisor.async_stream_nolink(
      Datum.TaskSupervisor,
      directories,
      fn dir ->
        Datum.Scanners.Filesystem.scan_directory(origin, dir,
          user_id: user.id,
          generate_checksum: generate_checksum
        )
      end,
      timeout: :infinity,
      ordered: false,
      max_concurrency: 8
    )
    |> Enum.each(fn _result -> IO.puts("Finished scan") end)

    # TODO: now that the scan has finished, we need to upload the new(ish) origin

    :ok
  end

  defp load_or_create_origin(user) do
    origin = Datum.DataOrigin.list_data_orgins_user(user) |> List.first()

    if origin do
      {:ok, origin}
    else
      origin_name = Prompt.text("Name the Data Origin which should be created")

      DataOrigin.create_origin(%{name: origin_name})
    end
  end

  # this loads the user and plugins from the remote database - this is currently non-idempotent, meaning
  # if you run it twice it will error out on attempting to insert records that already exist
  defp load_remote_db(client) do
    with {:ok, %{"id" => id, "email" => email} = _user} <- Client.current_user_info(client),
         {:ok, plugins_info} <- Client.list_plugins(client),
         {:ok, user} <-
           Datum.Accounts.insert_user(%Datum.Accounts.User{id: id, email: email}) do
      # load the plugins into the local operations DB - we'll fetch them again in the next step
      {_statuses, plugins} =
        plugins_info
        |> Enum.map(fn plugin -> Datum.Plugins.create_plugin(plugin) end)
        |> Enum.unzip()

      if plugins |> Enum.count(fn plugin -> plugin == %Ecto.Changeset{} end) > 0 do
        IO.puts(
          "Not all plugins could be loaded from the remote server. Functionality may be degraded"
        )
      end

      {user, plugins}
    else
      _ ->
        IO.puts(
          "Unable to fetch or sync either the current user for the token, or plugins - scan will proceed by will not be synced and functionality will be degraded"
        )

        {%Accounts.User{id: UUID.uuid4()}, []}
    end
  end
end
