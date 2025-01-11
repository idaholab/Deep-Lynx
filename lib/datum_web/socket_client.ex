defmodule DatumWeb.SocketClient do
  @moduledoc """
  This is a SlipStream websocket client designed for the CLI to interact
  with the central server.

  https://hexdocs.pm/slipstream/Slipstream.html - for more information
  """

  use Slipstream,
    restart: :temporary

  @topic "cli:lobby"

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
end
