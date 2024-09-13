defmodule DatumWeb.OriginExplorerLive do
  @moduledoc """
  This is our primary way of exploring a Data Origin. It is very similar
  to a file explorer, as it needs to represent directories and the files
  in those directories.

  This should not embed any additional live views - only components. If you
  need to build a live view, let's say a FileViewLive or something, then you
  should message the parent to spawn the relevant tab - not spawn and save it
  here.
  """
  use DatumWeb, :live_view

  def display_name, do: "Origin Explorer"
  alias Datum.Common
  alias Datum.DataOrigin

  def render(assigns) do
    ~H"""
    <div>
      <div class="breadcrumbs text-sm">
        <ul>
          <li :if={@origin}>
            <a><.icon name="hero-server-stack" class="pr-1 h-3 w-3" /><%= @origin.name %></a>
          </li>
        </ul>
      </div>
      <div>
        <span :if={@origins.loading} class="loading loading-bars loading-lg mx-auto"></span>
        <div :if={origins = @origins.ok? && !@origin && @origins.result}>
          <.file_table
            id={"origins_#{@tab.id}"}
            rows={origins}
            row_click={fn r -> JS.push("select_origin", value: %{"origin_id" => r.id}) end}
          >
            <:col><.icon name="hero-server-stack" /></:col>
            <:col :let={origin} label={gettext("Name")}><%= origin.name %></:col>
            <:col :let={origin} label={gettext("Date Created")}>
              <%= "#{origin.inserted_at.month}/#{origin.inserted_at.day}/#{origin.inserted_at.year}" %>
            </:col>

            <:action>
              <details class="dropdown">
                <summary class="hero-bars-3 text-primary-content ">open or close</summary>
                <div
                  tabindex="0"
                  class="right-0 dropdown-content card card-compact bg-primary text-primary-content z-[1] w-64 shadow"
                >
                  <ul class="menu menu-xs bg-base-400 rounded-box ">
                    <li><a>Permissions</a></li>
                    <li><a>Delete</a></li>
                  </ul>
                </div>
              </details>
            </:action>
          </.file_table>
        </div>

        <div :if={@items && @origin}>
          <.file_table
            id={"origins_#{@tab.id}"}
            rows={@items}
            row_click={fn r -> JS.push("select_item", value: %{"item_id" => r.id}) end}
          >
            <:col><.icon name="hero-server-stack" /></:col>
            <:col :let={data} label={gettext("Name")}><%= data.path %></:col>
            <:col :let={data} label={gettext("Date Created")}>
              <%= "#{data.inserted_at.month}/#{data.inserted_at.day}/#{data.inserted_at.year}" %>
            </:col>

            <:action>
              <details class="dropdown">
                <summary class="hero-bars-3 text-primary-content ">open or close</summary>
                <div
                  tabindex="0"
                  class="right-0 dropdown-content card card-compact bg-primary text-primary-content z-[1] w-64 shadow"
                >
                  <ul class="menu menu-xs bg-base-400 rounded-box ">
                    <li><a>Permissions</a></li>
                    <li><a>Delete</a></li>
                  </ul>
                </div>
              </details>
            </:action>
          </.file_table>
        </div>
      </div>
    </div>
    """
  end

  def mount(
        _params,
        %{"tab_id" => tab_id, "user_token" => user_token, "parent" => parent_pid} = _session,
        socket
      ) do
    user = Datum.Accounts.get_user_by_session_token(user_token)
    # we don't trust anything that gets sent over the session, so back it all up with the db
    # this also helps us get the latest state object
    tab = Common.get_user_tab(user, tab_id)

    # if we don't have a valid user or a valid tab - kill it with fire
    if !user.id || !tab do
      {:error, socket}
    else
      origin =
        if Map.get(tab.state, "origin_id") do
          DataOrigin.get_data_orgins_user(
            user,
            Map.get(tab.state, "origin_id")
          )
        else
          nil
        end

      # path_items = Map.get(tab.state, "path_items", []) |> Enum.map(fn id -> end)

      # set what we can here and common practice is to set all your used variables in the socket as
      # nil or empty so we don't cause rendeing errors - actually load them in the params OR load them
      # here with async assigns
      {:ok,
       socket
       |> assign(:items, nil)
       |> assign(:origin, origin)
       |> assign(:parent, parent_pid)
       |> assign(:current_user, user)
       |> assign(:tab, tab)
       |> assign_async(:origins, fn ->
         {:ok, %{origins: Datum.DataOrigin.list_data_orgins_user(user)}}
       end)}
    end
  end

  # select the origin, set it, and load the initial root files
  def handle_event("select_origin", %{"origin_id" => origin_id}, socket) do
    origin = DataOrigin.get_data_orgins_user(socket.assigns.current_user, origin_id)
    root_items = DataOrigin.list_roots(origin)

    {:noreply,
     socket
     # note that we don't want to shove the whole origin into here - only the ID
     |> assign(:items, root_items)
     |> assign(:origin, origin)
     |> update_state()}
  end

  # select an item from the list, adding it to the breadcrumbs and updating
  # state
  def handle_event("select_origin", %{"origin_id" => origin_id}, socket) do
    origin = DataOrigin.get_data_orgins_user(socket.assigns.current_user, origin_id)
    root_items = DataOrigin.list_roots(origin)

    {:noreply,
     socket
     |> assign(:items, root_items)
     |> assign(:origin, origin)
     |> update_state()}
  end

  # pull the common assigns from socket and update the tab's state with them
  # ALWAYS put at the END of the assigns list, or else it might not find what it needs
  def update_state(socket) do
    {:ok, _} =
      Common.update_explorer_tabs(socket.assigns.tab, %{
        state: %{
          origin_id:
            if socket.assigns.origin do
              socket.assigns.origin.id
            end,
          # path items are condensed down down to just their data ids - they'll be hydrated by the mount function
          path_items:
            if socket.assigns.path_items do
              Enum.map(socket.assigns.path_items, fn item -> item.id end)
            end,
          name:
            if socket.assigns.path_items do
              List.last(socket.assigns.path_items).path
            else
              if socket.assigns.origin do
                socket.assigns.origin.name
              else
                "Origin Explorer"
              end
            end
        }
      })

    notify_parent({:tab_updated, socket.assigns.tab.id}, socket.assigns.parent)
    socket
  end

  defp notify_parent(msg, process), do: send(process, msg)
end
