defmodule DatumWeb.LiveComponent.DeleteOrigin do
  @moduledoc """
  This is used to delete a data origin
  """

  # In Phoenix apps, the line is typically: use MyAppWeb, :live_component
  use DatumWeb, :live_component
  use Gettext, backend: DatumWeb.Gettext

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <div class="text-center text-black">
        {gettext(
          "Deleting a data origin will not affect your data. However, it will remove the stored connection configurations and metadata."
        )}
      </div>
      <div class="pt-4">
        <.button
          type="submit"
          class="absolute bottom-6 left-5"
          phx-click="close_modal"
          phx-target={@myself}
        >
          {gettext("Cancel")}
        </.button>
        <.button
          type="submit"
          class="absolute bottom-6 right-5"
          phx-click="delete_origin_modal"
          phx-value-origin_id={@origin_id}
          phx-target={@myself}
        >
          {gettext("Delete Origin")}
        </.button>
      </div>
    </div>
    """
  end

  @impl true
  def update(assigns, socket) do
    socket = socket |> assign(assigns)
    {:ok, socket}
  end

  # delete selected origin
  @impl true
  def handle_event("delete_origin_modal", %{"origin_id" => origin_id}, socket) do
    origin = Datum.DataOrigin.get_origin!(origin_id)
    Datum.DataOrigin.delete_origin(origin)

    # Send a message to the parent LiveView/LiveComponent to update origins
    send(self(), {:patch, nil, nil, socket.assigns.live_action})

    {:noreply,
     socket
     |> patch(socket.assigns.patch)}
  end

  @impl true
  def handle_event("close_modal", _params, socket) do
    {:noreply,
     socket
     |> patch(socket.assigns.patch)}
  end

  def patch(socket, to) do
    GenServer.call(socket.assigns.parent, {:patch, to})
    socket
  end
end
