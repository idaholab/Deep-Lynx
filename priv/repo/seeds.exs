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
alias Datum.Common

{:ok, admin} =
  Accounts.register_user(%{
    email: "admin@admin.com",
    password: "xxxxxxxxxxxx",
    name: "Administrator"
  })

{:ok, tab_one} =
  Common.create_explorer_tabs_for_user(admin, %{
    module: DatumWeb.ComponentsLive.DirectoryView,
    state: %{},
    user: admin
  })

{:ok, tab_two} =
  Common.create_explorer_tabs_for_user(admin, %{
    module: DatumWeb.ComponentsLive.DirectoryView,
    state: %{},
    user: admin
  })

{:ok, tab_three} =
  Common.create_explorer_tabs_for_user(admin, %{
    module: DatumWeb.ComponentsLive.DirectoryView,
    state: %{},
    user: admin
  })

{:ok, _user} = Accounts.update_user_open_tabs(admin, [[tab_one.id, tab_two.id], [tab_three.id]])
