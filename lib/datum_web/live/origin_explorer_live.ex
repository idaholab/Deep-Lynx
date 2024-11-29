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
  use Gettext, backend: DatumWeb.Gettext

  def display_name, do: "Origin Explorer"
  alias Datum.Common
  alias Datum.DataOrigin

  def render(assigns) do
    ~H"""
    <div>
      <div class="breadcrumbs text-sm">
        <ul>
          <span
            phx-click="close_tab"
            phx-value-tab-id={@tab.id}
            class="tooltip tooltip-right mr-5"
            data-tip={gettext("Close Tab")}
          >
            <.icon name="hero-x-mark" class="ml-2 h-5 w-5 cursor-pointer hover:bg-base-300" />
          </span>
          <li>
            <a phx-click="home_navigate">
              <.icon name="hero-home" class="mr-1 h-3 w-3" /><%= gettext("Home") %>
            </a>
          </li>
          <li :if={@origin}>
            <a phx-click="select_origin" phx-value-origin_id={@origin.id}>
              <.icon name="hero-server-stack" class="mr-1 h-3 w-3" /><%= @origin.name %>
            </a>
          </li>
          <%= for item <- @path_items do %>
            <li>
              <a phx-click="path_item_navigate" phx-value-id={item.id}>
                <span :if={item.type == :directory || item.type == :root_directory}>
                  <.icon name="hero-folder" class="mr-1 h-3 w-3" />
                </span>
                <%= item.path %>
              </a>
            </li>
          <% end %>
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
            <:col :let={data}>
              <span :if={data.type in [:directory, :root_directory]}>
                <.icon name="hero-folder" />
              </span>
              <span :if={data.type == :file}>
                <.icon name="hero-document" />
              </span>
              <span :if={data.type == :person}>
                <.icon name="hero-user" />
              </span>
              <span :if={data.type == :organization}>
                <.icon name="hero-user-group" />
              </span>
            </:col>
            <:col :let={data} label={gettext("Name")}><%= data.path %></:col>
            <:col :let={data} label={gettext("Date Created")}>
              <%= "#{data.inserted_at.month}/#{data.inserted_at.day}/#{data.inserted_at.year}" %>
            </:col>

            <:action :let={data}>
              <span
                class="tooltip tooltip-bottom"
                data-tip={gettext("Graph View")}
                phx-click="open_graph"
                phx-data-focus={data.id}
              >
                <svg
                  class="h-6 w-6 "
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 256 256"
                >
                  <path
                    fill="white"
                    d="M200 152a31.84 31.84 0 0 0-19.53 6.68l-23.11-18A31.65 31.65 0 0 0 160 128c0-.74 0-1.48-.08-2.21l13.23-4.41A32 32 0 1 0 168 104c0 .74 0 1.48.08 2.21l-13.23 4.41A32 32 0 0 0 128 96a32.6 32.6 0 0 0-5.27.44L115.89 81A32 32 0 1 0 96 88a32.6 32.6 0 0 0 5.27-.44l6.84 15.4a31.92 31.92 0 0 0-8.57 39.64l-25.71 22.84a32.06 32.06 0 1 0 10.63 12l25.71-22.84a31.91 31.91 0 0 0 37.36-1.24l23.11 18A31.65 31.65 0 0 0 168 184a32 32 0 1 0 32-32m0-64a16 16 0 1 1-16 16a16 16 0 0 1 16-16M80 56a16 16 0 1 1 16 16a16 16 0 0 1-16-16M56 208a16 16 0 1 1 16-16a16 16 0 0 1-16 16m56-80a16 16 0 1 1 16 16a16 16 0 0 1-16-16m88 72a16 16 0 1 1 16-16a16 16 0 0 1-16 16"
                  />
                </svg>
              </span>
            </:action>
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
        %{
          "tab_id" => tab_id,
          "group_index" => group_index,
          "user_token" => user_token,
          "parent" => parent_pid
        } = _session,
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

      path_items = Map.get(tab.state, "path_items", [])

      path_items =
        if origin && path_items != [] do
          data = DataOrigin.list_data_user(origin, user, only_ids: path_items)

          path_items
          |> Enum.map(fn p -> Enum.find(data, fn d -> d.id == p end) end)
          |> Enum.filter(fn i -> i end)
        else
          []
        end

      # the descendants of the last item in the path items should be what fills the screen now
      items =
        if path_items != [] do
          DataOrigin.list_data_descendants_user(origin, user, List.last(path_items).id)
        else
          if origin do
            DataOrigin.list_roots(origin)
          else
            []
          end
        end

      # set what we can here and common practice is to set all your used variables in the socket as
      # nil or empty so we don't cause rendeing errors - actually load them in the params OR load them
      # here with async assigns
      {:ok,
       socket
       |> assign(:items, items)
       |> assign(:path_items, path_items)
       |> assign(:origin, origin)
       |> assign(:parent, parent_pid)
       |> assign(:current_user, user)
       |> assign(:tab, tab)
       |> assign(:group_index, group_index)
       |> assign_async(:origins, fn ->
         {:ok, %{origins: Datum.DataOrigin.list_data_orgins_user(user)}}
       end)}
    end
  end

  def handle_event("home_navigate", _params, socket) do
    user = socket.assigns.current_user

    {:noreply,
     socket
     |> assign(:items, [])
     |> assign(:path_items, [])
     |> assign(:origin, nil)
     |> assign_async(:origins, fn ->
       {:ok, %{origins: Datum.DataOrigin.list_data_orgins_user(user)}}
     end)}
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
  def handle_event("select_item", %{"item_id" => item_id}, socket) do
    data = DataOrigin.get_data_user(socket.assigns.origin, socket.assigns.current_user, item_id)

    items =
      if data.type == :directory || data.type == :root_directory do
        DataOrigin.list_data_descendants_user(
          socket.assigns.origin,
          socket.assigns.current_user,
          data.id
        )
      else
        []
      end

    path_items =
      if socket.assigns.path_items == [] do
        [data]
      else
        socket.assigns.path_items ++ [data]
      end

    {:noreply,
     socket
     # update the path_items with the selected piece of data
     |> assign(:path_items, path_items)
     |> assign(:items, items)
     |> update_state()}
  end

  def handle_event("path_item_navigate", %{"id" => id}, socket) do
    path_items =
      socket.assigns.path_items
      |> Enum.take(Enum.find_index(socket.assigns.path_items, fn item -> item.id == id end) + 1)

    data = DataOrigin.get_data_user(socket.assigns.origin, socket.assigns.current_user, id)

    items =
      if data.type == :directory || data.type == :root_directory do
        DataOrigin.list_data_descendants_user(
          socket.assigns.origin,
          socket.assigns.current_user,
          data.id
        )
      else
        []
      end

    {:noreply,
     socket |> assign(:path_items, path_items) |> assign(:items, items) |> update_state()}
  end

  def handle_event("close_tab", _unsigned_params, socket) do
    notify_parent({:close_tab, socket.assigns.tab.id}, socket.assigns.parent)
    {:noreply, socket}
  end

  def handle_event("open_graph", %{"focus" => focus} = _params, socket) do
    notify_parent(
      {:open_tab, DatumWeb.GraphExplorerLive,
       %{items: [[focus, socket.assigns.origin.id]], focus: focus}, socket.assigns.group_index},
      socket.assigns.parent
    )

    {:noreply, socket}
  end

  def handle_event("open_graph", _params, socket) do
    notify_parent(
      {:open_tab, DatumWeb.GraphExplorerLive,
       %{
         items: Enum.map(socket.assigns.items, fn item -> [item.id, socket.assigns.origin.id] end)
       }, socket.assigns.group_index},
      socket.assigns.parent
    )

    {:noreply, socket}
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
            if socket.assigns.path_items != [] do
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
