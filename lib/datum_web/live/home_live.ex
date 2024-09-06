defmodule DatumWeb.HomeLive do
  use DatumWeb, :live_view

  alias Datum.Common

  def render(assigns) do
    ~H"""
    <div>
      <div class={"grid grid-flow-col grid-cols-#{Enum.count(@tabs)} gap-4"}>
        <div :for={tab_group <- @tabs}>
          <div role="tablist" class="tabs tabs tabs-lifted mb-5">
            <a
              :for={tab <- tab_group}
              role="tab"
              class={"tab #{if Enum.member?(@selected_tabs, tab.id) do "tab-active" else "hover:bg-neutral" end}"}
            >
              <%= Map.get(tab.state, :name, tab.module.display_name) %>
            </a>
            <a role="tab" class="tab hover:bg-gray-500">
              <.icon name="hero-plus-circle" class="size-xs" />
            </a>
          </div>
          <%= live_render(@socket, DatumWeb.DirectoryViewLive, id: "thermostat") %>
        </div>
      </div>
    </div>
    """
  end

  def mount(_params, _session, socket) do
    # get a list of open tabs on the user, fetch from the DB - no sorting necessary
    open_tabs = socket.assigns.current_user.open_explorer_tabs
    tabs = Common.list_open_tabs(socket.assigns.current_user, List.flatten(open_tabs))

    # grouping is essential as it tells the view how many panes to render
    tabs =
      open_tabs
      |> Enum.map(fn ots -> tabs |> Enum.filter(fn tab -> Enum.member?(ots, tab.id) end) end)

    {:ok, socket |> assign(:tabs, tabs)}
  end

  def handle_params(%{"selected_tabs" => selected_tabs}, _uri, socket) do
    # if the IDs don't exist in the tabs, it won't error out it'll just pick on
    {selected_tabs, _remainders} =
      String.split(selected_tabs, ",")
      |> Enum.map(fn selected -> Integer.parse(selected) end)
      |> Enum.unzip()

    {:noreply, socket |> assign(:selected_tabs, selected_tabs)}
  end

  # we need this here as a fallback in case of badly formatted params
  def handle_params(_params, _uri, socket) do
    {:noreply, socket}
  end
end
