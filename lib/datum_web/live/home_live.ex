defmodule DatumWeb.HomeLive do
  use DatumWeb, :live_view

  alias Datum.Common

  def render(assigns) do
    ~H"""
    <div>
      <div class="grid grid-flow-col grid-cols-2 gap-4">
        <div>
          <div role="tablist" class="tabs tabs tabs-lifted mb-5">
            <a role="tab" class="tab hover:bg-gray-500">Sensors Storage</a>
            <a role="tab" class="tab tab-active">Documents DB </a>
            <a role="tab" class="tab hover:bg-gray-500">Videos</a>
            <a role="tab" class="tab hover:bg-gray-500">
              <.icon name="hero-plus-circle" class="size-xs" />
            </a>
          </div>
          <.live_component module={DatumWeb.ComponentsLive.Explorer} id="explorer" />
        </div>
        <div>
          <div role="tablist" class="tabs tabs tabs-lifted mb-5">
            <a role="tab" class="tab tab-active">HPC Cluster A</a>
            <a role="tab" class="tab hover:bg-gray-500">
              <.icon name="hero-plus-circle" class="size-xs" />
            </a>
          </div>
          <.live_component module={DatumWeb.ComponentsLive.Explorer} id="explorer2" />
        </div>
      </div>
    </div>
    """
  end

  def mount(_params, _session, socket) do
    open_tabs = socket.assigns.current_user.open_explorer_tabs

    tabs = Common.list_open_tabs(socket.assigns.current_user, List.flatten(open_tabs))
    dbg(tabs)

    {:ok, socket}
  end
end
