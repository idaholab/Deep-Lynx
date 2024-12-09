defmodule DatumWeb.PluginsControllerTest do
  use DatumWeb.ConnCase, async: false
  setup :register_and_log_in_user

  import Datum.PluginsFixtures

  describe "Plugins controller" do
    test "gets plugin info", %{conn: conn, token: token} do
      conn =
        conn
        |> get(~p"/api/v1/plugins")

      assert json_response(conn, 200) == []

      plugin = plugin_fixture() |> Jason.encode!() |> Jason.decode!()

      conn = conn |> get(~p"/api/v1/plugins")
      assert json_response(conn, 200) == [plugin]
    end
  end
end
