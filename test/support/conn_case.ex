defmodule DatumWeb.ConnCase do
  @moduledoc """
  This module defines the test case to be used by
  tests that require setting up a connection.

  Such tests rely on `Phoenix.ConnTest` and also
  import other functionality to make it easier
  to build common data structures and query the data layer.

  Finally, if the test case interacts with the database,
  we enable the SQL sandbox, so changes done to the database
  are reverted at the end of every test. If you are using
  PostgreSQL, you can even run database tests asynchronously
  by setting `use DatumWeb.ConnCase, async: true`, although
  this option is not recommended for other databases.
  """

  use ExUnit.CaseTemplate

  using do
    quote do
      # The default endpoint for testing
      @endpoint DatumWeb.Endpoint

      use DatumWeb, :verified_routes

      # Import conveniences for testing with connections
      import Plug.Conn
      import Phoenix.ConnTest
      import DatumWeb.ConnCase
    end
  end

  setup tags do
    Datum.DataCase.setup_sandbox(tags)
    {:ok, conn: Phoenix.ConnTest.build_conn()}
  end

  @doc """
  Setup helper that registers and logs in users.

      setup :register_and_log_in_user

  It stores an updated connection and a registered user in the
  test context.
  """
  def register_and_log_in_user(%{conn: conn}) do
    user = Datum.AccountsFixtures.user_fixture()
    conn = log_in_user(conn, user)
    token = conn |> Plug.Conn.get_session(:user_api_token)

    conn =
      conn
      |> Plug.Conn.put_req_header("authorization", "Bearer #{token}")

    %{conn: conn, user: user, token: token}
  end

  @doc """
  Logs the given `user` into the `conn`.

  It returns an updated `conn`.
  """
  def log_in_user(conn, user) do
    token = Datum.Accounts.generate_user_session_token(user)
    api_token = Phoenix.Token.sign(DatumWeb.Endpoint, "personal_access_token", user.id)

    conn
    |> Phoenix.ConnTest.init_test_session(%{})
    |> Plug.Conn.put_session(:user_token, token)
    |> Plug.Conn.put_session(:user_api_token, api_token)
    |> DatumWeb.UserAuth.fetch_current_user([])
  end
end
