defmodule DatumWeb.UserConfirmationLiveTest do
  use DatumWeb.ConnCase, async: false

  import Phoenix.LiveViewTest
  import Datum.AccountsFixtures

  alias Datum.Accounts
  alias Datum.Repo

  setup do
    %{user: user_fixture()}
  end

  describe "Confirm user" do
    test "renders confirmation page", %{conn: conn} do
      {:ok, _lv, html} = live(conn, ~p"/users/confirm/some-token")
      assert html =~ "Confirm Account"
    end
  end
end
