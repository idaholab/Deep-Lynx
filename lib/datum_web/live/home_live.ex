defmodule DatumWeb.HomeLive do
  @moduledoc """
  This is the main navigation area after a user logs in. Consists of multiple panes of tabs, each
  tab should be its own separate live_view. Try to do as little as possible on this page, though it
  will probably get more complicated as we add inter-view communication.
  """
  use DatumWeb, :live_view

  alias Datum.Common

  def render(assigns) do
    ~H"""
    <div>
      <div class={"grid grid-flow-col grid-cols-#{Enum.count(@tabs)} gap-4"}>
        <div :for={{tab_group, group_index} <- Enum.with_index(@tabs)}>
          <div role="tablist" class="tabs tabs tabs-lifted mb-5">
            <a
              :for={tab <- tab_group}
              role="tab"
              phx-click="open_tab"
              phx-value-tab={tab.id}
              phx-value-group-index={group_index}
              class={"tab #{if Enum.member?(@selected_tabs, tab.id) do "tab-active" else "hover:bg-neutral" end}"}
            >
              <%= Map.get(tab.state, :name, tab.module.display_name) %>
            </a>
            <a role="tab" class="tab hover:bg-gray-500">
              <.icon name="hero-plus-circle" class="size-xs" />
            </a>
          </div>

          <%= if List.first(Enum.filter(tab_group, fn tab -> Enum.member?(@selected_tabs, tab) end))do %>
            <%= live_render(
              @socket,
              List.first(Enum.filter(tab_group, fn tab -> Enum.member?(@selected_tabs, tab) end)).module,
              id:
                "explorer_tab_#{List.first(Enum.filter(tab_group, fn tab -> Enum.member?(@selected_tabs, tab) end)).id}",
              session: %{
                "tab_id" =>
                  List.first(Enum.filter(tab_group, fn tab -> Enum.member?(@selected_tabs, tab) end)).id
              }
            ) %>
          <% else %>
            OPEN NEW TAB
          <% end %>
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

    {:ok, socket |> assign(:tabs, tabs) |> assign(:selected_tabs, [])}
  end

  def handle_params(%{"selected_tabs" => selected_tabs}, _uri, socket) do
    if selected_tabs == "" do
      {:noreply, socket}
    else
      # if the IDs don't exist in the tabs, it won't error out it'll just pick on
      {selected_tabs, _remainders} =
        String.split(selected_tabs, ",")
        |> Enum.map(fn selected -> Integer.parse(selected) end)
        |> Enum.unzip()

      {:noreply,
       socket
       |> assign(
         :selected_tabs,
         Enum.filter(List.flatten(socket.assigns.tabs), fn tab ->
           Enum.member?(selected_tabs, tab.id)
         end)
       )}
    end
  end

  # we need this here as a fallback in case of badly formatted params as well as handling already open tabs
  def handle_params(_params, _uri, socket) do
    {:noreply, socket}
  end

  # switch out the active tab - push patch handles re-rendering the live views
  def handle_event("open_tab", %{"tab" => tab_id, "group-index" => group_index}, socket) do
    {group_index, _} = Integer.parse(group_index)
    {tab_id, _} = Integer.parse(tab_id)

    new_tab = Enum.find(Enum.at(socket.assigns.tabs, group_index), fn t -> t.id == tab_id end)

    selected_tabs =
      case Enum.count(socket.assigns.selected_tabs) do
        0 ->
          List.duplicate(nil, group_index + 1) |> List.replace_at(group_index, new_tab)

        _ ->
          if Enum.count(socket.assigns.selected_tabs) <= group_index do
            socket.assigns.selected_tabs ++ [new_tab]
          else
            List.replace_at(socket.assigns.selected_tabs, group_index, new_tab)
          end
      end

    {:noreply,
     socket
     |> assign(:selected_tabs, selected_tabs)
     |> push_patch(
       to:
         ~p"/home?selected_tabs=#{selected_tabs |> Enum.map(fn t -> if t do
             t.id
           else
             0
           end end) |> Enum.join(",")}"
     )}
  end

  # handles a call from one of the tabs to close it - we will take it out of the tabs list
  # and update that on the user to avoid re-opening
  def handle_info({:close_tab, tab_id}, socket) do
    tabs =
      socket.assigns.tabs
      |> Enum.map(fn group -> Enum.filter(group, fn t -> t.id != tab_id end) end)

    Datum.Accounts.update_user_open_tabs(
      socket.assigns.current_user,
      tabs |> Enum.map(fn group -> group |> Enum.map(fn tab -> tab.id end) end)
    )

    if socket.assigns.selected_tabs && socket.assigns.selected_tabs != [] do
      {:noreply,
       socket
       |> assign(:tabs, tabs)
       |> assign(
         :selected_tabs,
         Enum.filter(socket.assigns.selected_tabs, fn t -> t.id != tab_id end)
       )
       |> push_patch(to: ~p"/home")}
    else
      {:noreply, socket |> assign(:tabs, tabs)}
    end
  end
end
