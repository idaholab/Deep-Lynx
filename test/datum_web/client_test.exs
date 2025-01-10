defmodule DatumWeb.ClientTest do
  @moduledoc """
  Runs the test in the http client
  """
  use DatumWeb.ConnCase, async: false

  setup :register_and_log_in_user

  import Datum.PluginsFixtures
  import Datum.DataOriginFixtures

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

    test "gets data_origin info", %{conn: conn, user: user} do
      Req.Test.stub(DatumWeb.OriginControllerStub, fn _c ->
        # we override the provided connection because we want the test case supplied one
        DatumWeb.OriginController.list(conn, nil)
      end)

      client =
        DatumWeb.Client.new!(Plug.Conn.request_url(conn),
          plug: {Req.Test, DatumWeb.OriginControllerStub}
        )

      # first assert that things are working without us adding any plugins
      assert {:ok, []} = client |> DatumWeb.Client.list_origins()
      assert _plugins = client |> DatumWeb.Client.list_origins!()

      origin = origin_fixture(%{owned_by: user.id}) |> Jason.encode!() |> Jason.decode!()
      assert {:ok, [origin]} == client |> DatumWeb.Client.list_origins()
    end

    test "creates new origin", %{conn: conn, user: user} do
      body = %{
        "name" => "some name",
        "type" => :filesystem,
        "config" => %{
          "path" => "/some/nonexistent/path/two",
          "description" => "keyword description",
          "tags" => ["tag", "hello"],
          "domains" => ["domain"],
          "type" => "file"
        }
      }

      Req.Test.stub(DatumWeb.OriginControllerStub, fn _c ->
        # we override the provided connection because we want the test case supplied one
        DatumWeb.OriginController.create(conn, body)
      end)

      client =
        DatumWeb.Client.new!(Plug.Conn.request_url(conn),
          plug: {Req.Test, DatumWeb.OriginControllerStub}
        )

      # first assert that things are working without us adding any plugins
      assert {:ok, origin} =
               client
               |> DatumWeb.Client.create_origin(body)

      assert _origin =
               client
               |> DatumWeb.Client.create_origin!(body)
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
