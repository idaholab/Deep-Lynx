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
alias Datum.Common
alias Datum.Accounts
alias Datum.DataOrigin

{:ok, admin} =
  Accounts.register_user(%{
    email: "admin@inl.com",
    password: "xxxxxxxxxxxx",
    name: "INL Administrator"
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
    owned_by: admin.id
  })

# build a simple nested directory to store the equipment data in
equipment_dir =
  DataOrigin.add_data!(equipment_origin, admin, %{
    path: "Equipment",
    original_path: "/Equipment",
    type: :root_directory,
    owned_by: admin.id
  })

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
]
|> Enum.map(fn equipment ->
  e =
    DataOrigin.add_data!(equipment_origin, admin, %{
      path: "Equipment/#{equipment}",
      type: :file,
      owned_by: admin.id
    })

  {:ok, _} = DataOrigin.connect_data(equipment_origin, equipment_dir, e)

  {:ok, _} =
    DataOrigin.add_relationship({e, equipment_origin}, {nas_sensor_dir, nas_origin},
      type: "sensor"
    )
end)

admin_token = Phoenix.Token.sign(DatumWeb.Endpoint, "personal_access_token", admin.id)
IO.puts("ADMIN PAT: #{admin_token}")
