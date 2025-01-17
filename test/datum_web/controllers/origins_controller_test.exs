defmodule DatumWeb.OriginsControllerTest do
  use DatumWeb.ConnCase, async: false
  setup :register_and_log_in_user

  import Datum.DataOriginFixtures
  import Datum.AccountsFixtures

  describe "Origins controller" do
    test "lists origin info", %{conn: conn, token: token, user: user} do
      conn =
        conn
        |> get(~p"/api/v1/origins")

      assert json_response(conn, 200) == []

      origin =
        origin_fixture(%{
          owned_by: user.id
        })
        |> Jason.encode!()
        |> Jason.decode!()

      not_owned = origin_fixture()

      conn = conn |> get(~p"/api/v1/origins")
      assert json_response(conn, 200) == [origin]
    end

    test "create origin", %{conn: conn, token: token, user: user} do
      conn =
        conn
        |> put(~p"/api/v1/origins", %{
          name: "some name",
          type: :filesystem,
          config: %{
            "path" => "/some/nonexistent/path/two",
            "description" => "keyword description",
            "tags" => ["tag", "hello"],
            "domains" => ["domain"],
            "type" => "file"
          }
        })

      assert json_response(conn, 201)

      conn = conn |> get(~p"/api/v1/origins")
      assert json_response(conn, 200) != []
    end

    test "creates data on origin", %{conn: conn, token: token, user: user} do
      origin =
        origin_fixture(%{
          owned_by: user.id
        })

      conn =
        conn
        |> put(~p"/api/v1/origins/#{origin}/data", %{
          path: "some/path",
          type: :file
        })

      assert json_response(conn, 201)
    end
  end
end
