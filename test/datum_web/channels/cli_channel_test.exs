defmodule DatumWeb.CLIChannelTest do
  use DatumWeb.ChannelCase, async: false

  import Datum.DataOriginFixtures

  setup do
    user = Datum.AccountsFixtures.user_fixture()

    {:ok, _, socket} =
      DatumWeb.CLISocket
      |> socket("test_socket", %{current_user: user})
      |> subscribe_and_join(DatumWeb.CLIChannel, "cli:lobby")

    %{socket: socket, user: user}
  end

  test "ping replies with status ok", %{socket: socket} do
    ref = push(socket, "ping", %{"hello" => "there"})
    assert_reply ref, :ok, %{"hello" => "there"}
  end

  test "shout broadcasts to cli:lobby", %{socket: socket} do
    push(socket, "shout", %{"hello" => "all"})
    assert_broadcast "shout", %{"hello" => "all"}
  end

  test "broadcasts are pushed to the client", %{socket: socket} do
    broadcast_from!(socket, "broadcast", %{"some" => "data"})
    assert_push "broadcast", %{"some" => "data"}
  end
end
