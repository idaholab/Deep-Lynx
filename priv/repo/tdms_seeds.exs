# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:
#
#     Datum.Repo.insert!(%Datum.SomeSchema{})
#
# We recommend using the bang functions (`insert!`, `update!`
# and so on) as they will fail if something goes wrong.
alias Datum.Accounts
alias Datum.DataOrigin

{:ok, admin} =
  Accounts.register_user(%{
    id: "dd9ed86c-9be6-4c37-a5d0-6996dc11af40",
    email: "admin@inl.gov",
    password: "xxxxxxxxxxxx",
    name: "INL Administrator"
  })

Accounts.set_admin(admin)

{:ok, %Datum.Plugins.Plugin{} = _plugin} =
  Datum.Plugins.create_plugin(%{
    name: "TDMS Metadata",
    module_type: :elixir,
    module_name: Datum.Plugins.Tdms,
    filetypes: [".tdms_index"],
    plugin_type: :extractor,
    enabled: true
  })

{:ok, %Datum.Plugins.Plugin{} = _plugin} =
  Datum.Plugins.create_plugin(%{
    name: "CSV Extractor",
    module_type: :elixir,
    module_name: Datum.Plugins.CSV,
    filetypes: [".csv", "text/csv"],
    plugin_type: :extractor,
    enabled: true
  })

{:ok, %Datum.Plugins.Plugin{} = _plugin} =
  Datum.Plugins.create_plugin(%{
    name: "Parquet Extractor",
    module_type: :elixir,
    module_name: Datum.Plugins.Parquet,
    filetypes: [".pqt", "parquet", "application/vnd.apache.parquet"],
    plugin_type: :extractor,
    enabled: true
  })

{:ok, %Datum.Plugins.Plugin{} = _plugin} =
  Datum.Plugins.create_plugin(%{
    name: "Python TDMS Sampler with Plotter",
    module_type: :python,
    module_name: "sensor_plotting",
    path: Path.join(__DIR__, "sensor_plotting.py"),
    filetypes: [".tdms", "tdms"],
    plugin_type: :sampler,
    enabled: true
  })

{:ok, %Datum.Plugins.Plugin{} = plugin} =
  Datum.Plugins.create_plugin(%{
    name: "Python TDMS Sampler with Plotter",
    module_type: :python,
    module_name: "tdms_duckdb",
    path: Path.join(__DIR__, "tdms_duckdb.py"),
    filetypes: [".tdms", "tdms"],
    plugin_type: :sampler,
    enabled: true
  })

# note that the origin db won't be created here if it doesn't exist
# that doesn't happen until we use it
{:ok, equipment_origin} =
  DataOrigin.create_origin(%{
    name: "Equipment",
    owned_by: admin.id
  })

{:ok, nas_origin} =
  DataOrigin.create_origin(%{
    name: "NAS",
    owned_by: admin.id,
    config: %DataOrigin.Origin.FilesystemConfig{
      path: "#{__DIR__}"
    }
  })

{:ok, sensor_db_origin} =
  DataOrigin.create_origin(%{
    name: "Twin DB",
    owned_by: admin.id,
    type: :duckdb,
    config: %DataOrigin.Origin.DuckDBConfig{
      path: Path.join("#{__DIR__}", "test_db.duckdb")
    }
  })

{:ok, _sensor_db_origin} =
  DataOrigin.create_origin(%{
    name: "General Data DB",
    owned_by: admin.id,
    type: :duckdb,
    config: %DataOrigin.Origin.DuckDBConfig{
      path: Path.join([System.user_home(), "deeplynx", "duckdbs", "general.duckdb"]),
      watch: true
    }
  })

{:ok, _sensor_db_origin} =
  DataOrigin.create_origin(%{
    name: "Electromagnetic Data DB",
    owned_by: admin.id,
    type: :duckdb,
    config: %DataOrigin.Origin.DuckDBConfig{
      path: Path.join([System.user_home(), "deeplynx", "duckdbs", "eh.duckdb"]),
      watch: true
    }
  })

{:ok, _sensor_db_origin} =
  DataOrigin.create_origin(%{
    name: "Thermocouple Data DB",
    owned_by: admin.id,
    type: :duckdb,
    config: %DataOrigin.Origin.DuckDBConfig{
      path: Path.join([System.user_home(), "deeplynx", "duckdbs", "th.duckdb"]),
      watch: true
    }
  })

{:ok, _sensor_db_origin} =
  DataOrigin.create_origin(%{
    name: "Accelerometer Data DB",
    owned_by: admin.id,
    type: :duckdb,
    config: %DataOrigin.Origin.DuckDBConfig{
      path: Path.join([System.user_home(), "deeplynx", "duckdbs", "acc.duckdb"]),
      watch: true
    }
  })

# build a simple nested directory to store the equipment data in
equipment_root_dir =
  DataOrigin.add_data!(equipment_origin, admin, %{
    path: "Equipment",
    original_path: "/Equipment",
    type: :root_directory,
    owned_by: admin.id
  })

equipment_dir =
  DataOrigin.add_data!(equipment_origin, admin, %{
    path: "Equipment/Equipment",
    original_path: "/Equipment/Equipment",
    type: :directory,
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(equipment_origin, equipment_root_dir, equipment_root_dir)
{:ok, _} = DataOrigin.connect_data(equipment_origin, equipment_root_dir, equipment_dir)

nas_root_dir =
  DataOrigin.add_data!(nas_origin, admin, %{
    path: "NAS",
    original_path: "/NAS",
    type: :root_directory,
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(nas_origin, nas_root_dir, nas_root_dir)

nas_dir =
  DataOrigin.add_data!(nas_origin, admin, %{
    path: "NAS/Sensors",
    original_path: "/NAS/Sensors",
    type: :directory,
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(nas_origin, nas_root_dir, nas_dir)

nas_sensor_dir =
  DataOrigin.add_data!(nas_origin, admin, %{
    path: "NAS/Sensors/SensorA",
    original_path: "/NAS/Sensors/SensorA",
    type: :directory,
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(nas_origin, nas_dir, nas_sensor_dir)

nas_sensor_chart =
  DataOrigin.add_data!(nas_origin, admin, %{
    path: "NAS/Sensors/SensorA/freqplot.png",
    original_path: Path.join("#{__DIR__}", "freqplot.png"),
    type: :file,
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(nas_origin, nas_sensor_dir, nas_sensor_chart)

nas_duckdb_file =
  DataOrigin.add_data!(nas_origin, admin, %{
    path: "NAS/Sensors/SensorA/test_db.duckdb",
    original_path: Path.join("#{__DIR__}", "test_db.duckdb"),
    type: :file,
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(nas_origin, nas_sensor_dir, nas_duckdb_file)

db_table =
  DataOrigin.add_data!(sensor_db_origin, admin, %{
    path: "daq1",
    original_path: "daq1",
    type: :table,
    owned_by: admin.id,
    properties: %{
      columns: [
        %{
          type: "DOUBLE",
          name: "first__channel"
        }
      ]
    }
  })

{:ok, _} =
  DataOrigin.add_relationship({db_table, sensor_db_origin}, {nas_sensor_chart, nas_origin},
    type: "first__channel"
  )

Enum.map(
  [
    "Across International IHL70",
    "Across International WAC10",
    "Amada S20V Contour Saw",
    "Amada VT555 Tilt Saw",
    "Camco JVAC 16",
    "Doosan DNM 5700",
    "Doosan Puma GT2600",
    "Eplus3D EP-M260 Metal 3D Printer",
    "HAAS UMC 750SS",
    "Sidick ALN600GH",
    "Stratasys F900"
  ],
  fn equipment ->
    {:ok, e} =
      DataOrigin.add_data(equipment_origin, admin, %{
        path: "Equipment/#{equipment}",
        type: :file,
        owned_by: admin.id
      })

    {:ok, _} = DataOrigin.connect_data(equipment_origin, equipment_dir, e)

    {:ok, _} =
      DataOrigin.add_relationship({e, equipment_origin}, {db_table, sensor_db_origin},
        type: "first__channel"
      )
  end
)

admin_token =
  Phoenix.Token.sign(
    Keyword.get(Application.get_env(:datum, DatumWeb.Endpoint), :secret_key_base),
    "personal_access_token",
    admin.id,
    max_age: 31_556_952
  )

IO.puts(:stdio, "ADMIN PAT: #{admin_token}")
