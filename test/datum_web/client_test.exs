defmodule DatumWeb.ClientTest do
  @moduledoc """
  Runs the test in the http client
  """
  use DatumWeb.ConnCase, async: false

  setup :register_and_log_in_user

  import Datum.PluginsFixtures

  describe "client module" do
    test "gets plugin info", %{conn: conn} do
      Req.Test.stub(DatumWeb.PluginsControllerStub, fn _c ->
        # we override the provided connection because we want the test case supplied one
        DatumWeb.PluginsController.list_info(conn, nil)
      end)

      client =
        DatumWeb.Client.new!(Plug.Conn.request_url(conn),
          plug: {Req.Test, DatumWeb.PluginsControllerStub}
        )

      # first assert that things are working without us adding any plugins
      assert {:ok, []} = client |> DatumWeb.Client.list_plugins()
      assert _plugins = client |> DatumWeb.Client.list_plugins!()

      # plugins are system level - not really permissions based, so once we add one we should see it
      # encode and decode because that's whats coming back
      plugin = plugin_fixture() |> Jason.encode!() |> Jason.decode!()
      assert {:ok, [plugin]} == client |> DatumWeb.Client.list_plugins()
    end

    test "gets current user info", %{conn: conn, user: user} do
      Req.Test.stub(DatumWeb.UserSessionControllerStub, fn _c ->
        # we override the provided connection because we want the test case supplied one
        DatumWeb.UserSessionController.user_details(conn, nil)
      end)

      client =
        DatumWeb.Client.new!(Plug.Conn.request_url(conn),
          plug: {Req.Test, DatumWeb.UserSessionControllerStub}
        )

      assert {:ok, fetched_user} = client |> DatumWeb.Client.current_user_info()
      assert fetched_user["id"] == user.id
    end
  end
end
