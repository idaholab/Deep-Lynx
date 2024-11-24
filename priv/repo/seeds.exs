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
    email: "admin@admin.com",
    password: "xxxxxxxxxxxx",
    name: "Administrator"
  })

# note that the origin db won't be created here if it doesn't exist
# that doesn't happen until we use it
{:ok, origin} =
  DataOrigin.create_origin(%{
    name: "Test Origin",
    owned_by: admin.id
  })

{:ok, origin2} =
  DataOrigin.create_origin(%{
    name: "Test Origin The Second",
    owned_by: admin.id
  })

# build a simple nested directory
dir_one =
  DataOrigin.add_data!(origin, %{
    path: "root",
    original_path: "/Users/darrjw/home",
    type: :root_directory,
    owned_by: admin.id
  })

file_one =
  DataOrigin.add_data!(origin, %{
    path: "test.txt",
    original_path: "/Users/darrjw/home/test.txt",
    type: :file,
    tags: ["sensor data"],
    domains: ["geomagentic"],
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(origin, dir_one, dir_one)
{:ok, _} = DataOrigin.connect_data(origin, dir_one, file_one)

dir_two =
  DataOrigin.add_data!(origin, %{
    path: "second",
    original_path: "/Users/darrjw/home/second",
    type: :directory,
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(origin, dir_one, dir_two)

file_two =
  DataOrigin.add_data!(origin, %{
    path: "picture.png",
    original_path: "/Users/darrjw/home/second/picture.png",
    tags: ["selfies"],
    domain: ["individualisim"],
    type: :file,
    owned_by: admin.id
  })

person =
  DataOrigin.add_data!(origin, %{
    path: "James Holden",
    original_path: "/Users/darrjw/home/second/picture.png",
    type: :person,
    owned_by: admin.id
  })

org =
  DataOrigin.add_data!(origin, %{
    path: "OPA",
    original_path: "/Users/darrjw/home/second/picture.png",
    type: :organization,
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(origin, dir_two, file_two)
{:ok, _} = DataOrigin.connect_data(origin, dir_two, person)
{:ok, _} = DataOrigin.connect_data(origin, dir_two, org)

# now do the same for the other origin, eventually we can do specific things
# build a simple nested directory
dir_one =
  DataOrigin.add_data!(origin2, %{
    path: "root",
    original_path: "/Users/darrjw/home",
    type: :root_directory,
    owned_by: admin.id
  })

file_one =
  DataOrigin.add_data!(origin2, %{
    path: "test.txt",
    original_path: "/Users/darrjw/home/test.txt",
    type: :file,
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(origin2, dir_one, dir_one)
{:ok, _} = DataOrigin.connect_data(origin2, dir_one, file_one)

dir_two =
  DataOrigin.add_data!(origin2, %{
    path: "second",
    original_path: "/Users/darrjw/home/second",
    type: :directory,
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(origin2, dir_one, dir_two)

file_two =
  DataOrigin.add_data!(origin2, %{
    path: "picture.png",
    original_path: "/Users/darrjw/home/second/picture.png",
    type: :file,
    owned_by: admin.id
  })

{:ok, _} = DataOrigin.connect_data(origin2, dir_two, file_two)

# Tabs for the home page view, eventually won't need them as we'll want to maintain state a different way
{:ok, tab_one} =
  Common.create_explorer_tabs_for_user(admin, %{
    module: DatumWeb.OriginExplorerLive,
    state: %{},
    user: admin
  })

{:ok, tab_two} =
  Common.create_explorer_tabs_for_user(admin, %{
    module: DatumWeb.OriginExplorerLive,
    state: %{},
    user: admin
  })

{:ok, tab_three} =
  Common.create_explorer_tabs_for_user(admin, %{
    module: DatumWeb.OriginExplorerLive,
    state: %{},
    user: admin
  })

{:ok, _user} = Accounts.update_user_open_tabs(admin, [[tab_one.id, tab_two.id], [tab_three.id]])
