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

    test "fetch origin", %{conn: conn, token: token, user: user} do
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

      assert origin = json_response(conn, 201)

      conn = conn |> get(~p"/api/v1/origins/#{origin["id"]}")
      assert json_response(conn, 200) == origin
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

    test "fetches data", %{conn: conn, token: token, user: user} do
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

      assert data = json_response(conn, 201)

      conn =
        conn
        |> get(~p"/api/v1/origins/#{origin}/data/#{data["id"]}")

      assert fetched = json_response(conn, 200)
      assert fetched == data
    end

    test "explores a duckdb origin", %{conn: conn, token: token, user: user} do
      # need to create the db first - because the query opens it in readonly mode and will error if it doesn't exist
      path = "#{__DIR__}/open_test.duckdb"

      {:ok, _state} =
        Datum.Duckdb.init(%{parent: self(), path: path})

      conn =
        conn
        |> put(~p"/api/v1/origins", %{
          name: "some name",
          type: :duckdb,
          config: %{
            "path" => path
          }
        })

      assert origin = json_response(conn, 201)

      conn =
        conn
        |> post(~p"/api/v1/origins/#{origin["id"]}/explore", %{
          query: "select * from duckdb_settings() LIMIT 1;"
        })

      IO.inspect(conn.resp_body)

      assert data = json_response(conn, 200)
    end

    test "can list root directories", %{conn: conn, token: token, user: user} do
      origin =
        origin_fixture(%{
          owned_by: user.id
        })

      # might as well add data this way, just as a fast and double checks the endpoint
      conn =
        conn
        |> put(~p"/api/v1/origins/#{origin}/data", %{
          path: "some/path",
          type: :root_directory
        })

      assert root = json_response(conn, 201)

      conn =
        conn
        |> put(~p"/api/v1/origins/#{origin}/data", %{
          path: "some/path/file.txt",
          type: :file
        })

      assert data = json_response(conn, 201)

      conn =
        conn
        |> get(~p"/api/v1/origins/#{origin}/data")

      assert root_list = json_response(conn, 200)
      assert root_list == [data]
    end
  end
end
