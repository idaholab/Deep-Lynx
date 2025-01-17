defmodule DatumWeb.SocketClient do
  @moduledoc """
  This is a SlipStream websocket client designed for the CLI to interact
  with the central server.

  https://hexdocs.pm/slipstream/Slipstream.html - for more information
  """

  use Slipstream,
    restart: :temporary

  @topic "cli:lobby"

  @doc """
  This sends a socket message with a piece of data to client.
  """
  def send_data(origin_id, user_id, %Datum.DataOrigin.Data{} = data) do
    GenServer.call(__MODULE__, {:send_data, origin_id, user_id, data})
  end

  @doc """
  This sends a socket message requesting the client delete a peice of data
  """
  def remove_data(origin_id, path) do
    GenServer.call(__MODULE__, {:remove_data, origin_id, path})
  end

  def start_link(%{endpoint: _endpoint, token: _token} = args) do
    Slipstream.start_link(__MODULE__, args, name: __MODULE__)
  end

  @impl Slipstream
  def init(%{endpoint: endpoint, token: token} = _config) do
    endpoint_url = URI.new!(endpoint)

    endpoint =
      %URI{
        host: endpoint_url.host,
        port: endpoint_url.port,
        scheme: "ws"
      }
      |> URI.append_path("/cli/websocket")
      |> URI.append_query(URI.encode_query(%{vsn: "2.0.0", token: token}))

    {:ok, connect!(uri: endpoint)}
  end

  @impl Slipstream
  def handle_connect(socket) do
    {:ok, join(socket, @topic)}
  end

  @impl Slipstream
  def handle_call({:send_data, origin_id, user_id, data}, _from, socket) do
    status =
      push(socket, @topic, "data:add", %{origin_id: origin_id, user_id: user_id, data: data})

    {:reply, status, socket}
  end

  @impl Slipstream
  def handle_call({:remove_data, origin_id, path}, _from, socket) do
    status =
      push(socket, @topic, "data:remove", %{origin_id: origin_id, path: path})

    {:reply, status, socket}
  end
end
