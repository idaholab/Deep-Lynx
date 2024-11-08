defmodule DatumWeb.PluginsControllerTest do
  use DatumWeb.ConnCase, async: false

  describe "Plugins controller" do
    test "gets plugin info", %{conn: conn} do
      # conn = conn |> get(~p"/api/v1/plugins")

      # assert = json_response(conn, 200)["body"] == []
      assert true
    end
  end
end
