defmodule DatumWeb.CLIChannel do
  use DatumWeb, :channel
  alias Datum.DataOrigin
  alias Datum.Accounts

  @impl true
  def join("cli:lobby", _payload, socket) do
    {:ok, socket}
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (cli:lobby).
  @impl true
  def handle_in("shout", payload, socket) do
    broadcast(socket, "shout", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in(
        "data:add",
        %{"origin_id" => origin_id, "user_id" => user_id, "data" => data},
        socket
      ) do
    user = Accounts.get_user!(user_id)
    origin = DataOrigin.get_origin!(origin_id)

    # so we need to add both the piece of data, and make the connection between it and its
    # parent directory - add_data has an on_conflict clause with the pathname - and will return
    # the existing data record (without erroring) if one is there meaning this action is idempotent
    with {:ok, data} <- DataOrigin.add_data(origin, user, data),
         {:ok, dir} <-
           DataOrigin.add_data(origin, user, %{
             path: Path.dirname(data.path),
             type: :directory
           }),
         {:ok, _p} <- DataOrigin.connect_data(origin, dir, data) do
    end

    {:reply, :ok, socket}
  end

  @impl true
  def handle_in(
        "data:remove",
        %{"origin_id" => origin_id, "path" => path},
        socket
      ) do
    origin = DataOrigin.get_origin!(origin_id)
    data = DataOrigin.get_data_by_path!(origin, path)

    # remove all descendants first - remember this is probably from a directory
    # that no longeer exists
    if data do
      DataOrigin.list_data_descendants(origin, data.id)
      |> Enum.map(fn d -> DataOrigin.delete_data(origin, d) end)
    end

    # now delete the data
    DataOrigin.delete_data(origin, data)
    {:reply, :ok, socket}
  end
end
