defmodule DatumWeb.HomeLive do
  @moduledoc """
  This is the main navigation area after a user logs in. Consists of multiple panes of tabs, each
  tab should be its own separate live_view. Try to do as little as possible on this page, though it
  will probably get more complicated as we add inter-view communication.
  """
  use DatumWeb, :live_view
  use Gettext, backend: DatumWeb.Gettext

  alias Datum.Common

  def render(assigns) do
    ~H"""
    <div>
      <div class="navbar bg-base-100">
        <div class="navbar-start"></div>
        <div class="navbar-end">
          <div class="tooltip tooltip-top" data-tip="New Pane" phx-click="new_pane">
            <.icon name="hero-squares-plus" class="size-xs hover:bg-gray-500 cursor-pointer" />
          </div>
        </div>
      </div>
      <div class={"grid grid-flow-col-dense grid-cols-#{Enum.count(@tabs)} auto-cols-fr gap-4"}>
        <div
          :for={{tab_group, group_index} <- Enum.with_index(@tabs)}
          id={"tab_group_#{group_index}"}
          class={
            if group_index <= 0 do
              "mt-1"
            end
          }
          data-group={group_index}
          phx-hook="DraggableDropZone"
        >
          <div
            class="tooltip tooltip-top"
            data-tip="Close Pane"
            phx-click="close_pane"
            phx-value-group-index={group_index}
          >
            <.icon
              :if={group_index > 0}
              name="hero-x-mark"
              class="size-xs cursor-pointer hover:bg-base-300"
            />
          </div>
          <div role="tablist" class="tabs tabs-boxed mb-3">
            <a
              :for={tab <- tab_group}
              id={"tab_#{tab.id}"}
              role="tab"
              phx-click="open_tab"
              phx-value-tab={tab.id}
              draggable="true"
              phx-hook="DraggableTab"
              data-tab={tab.id}
              data-group={group_index}
              phx-value-group-index={group_index}
              class={"tab tooltip tooltip-bottom #{if Enum.member?(@selected_tabs, tab) do "tab-active" else "hover:bg-neutral" end}"}
              data-tip="Click to open or Drag to move"
            >
              <%= Map.get(tab.state, "name", tab.module.display_name()) %>
            </a>
            <a
              role="tab"
              class={"tab tooltip tooltip-bottom #{if closed_tabs(group_index, @selected_tabs, @tabs) do "tab-active" else "hover:bg-neutral" end}"}
              data-tip="New Tab"
              phx-click="add_tab"
              phx-value-group={group_index}
            >
              <.icon name="hero-plus-circle" class="size-xs" />
            </a>
          </div>

          <%= if List.first(Enum.filter(tab_group, fn tab -> Enum.member?(@selected_tabs, tab) end))do %>
            <div class="divider p-0 m-0"></div>
            <%= live_render(
              @socket,
              Enum.find(tab_group, fn tab -> Enum.member?(@selected_tabs, tab) end).module,
              id:
                "explorer_tab_#{List.first(Enum.filter(tab_group, fn tab -> Enum.member?(@selected_tabs, tab) end)).id}",
              session: %{
                "group_index" => group_index,
                "parent" => self(),
                "tab_id" => Enum.find(tab_group, fn tab -> Enum.member?(@selected_tabs, tab) end).id
              }
            ) %>
          <% end %>
          <div :if={closed_tabs(group_index, @selected_tabs, @tabs)}>
            <div class="divide-y divide-accent overflow-hidden rounded-lg bg-base-300 shadow sm:grid sm:grid-cols-2 sm:gap-px sm:divide-y-0">
              <div
                phx-click="open_tab"
                phx-value-group={group_index}
                phx-value-tab="Elixir.DatumWeb.OriginExplorerLive"
                class="hover:bg-base-300 group relative rounded-tl-lg rounded-tr-lg bg-base-200 p-6 sm:rounded-tr-none cursor-pointer"
              >
                <div>
                  <span class="inline-flex rounded-lg p-3 text-white ring-4 ring-base-400 bg-base-300">
                    <.icon name="hero-circle-stack" />
                  </span>
                </div>
                <div class="mt-8">
                  <h3 class="text-base font-semibold leading-6 text-primary-content">
                    <a class="focus:outline-none">
                      <span class="absolute inset-0" aria-hidden="true"></span> <%= gettext(
                        "Explore Data Origins"
                      ) %>
                    </a>
                  </h3>
                  <p class="mt-2 text-sm text-primary-content">
                    <%= gettext("Explore Data Origins Description") %>
                  </p>
                </div>

                <span
                  class="pointer-events-none absolute right-6 top-6 text-gray-300 group-hover:text-gray-400"
                  aria-hidden="true"
                >
                  <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </div>
              <div
                phx-click="open_tab"
                phx-value-group={group_index}
                phx-value-tab="Elixir.DatumWeb.SearchLive"
                class="hover:bg-base-300 group relative bg-base-200 p-6 sm:rounded-tr-lg"
              >
                <div>
                  <span class="inline-flex rounded-lg bg-base-300 p-3 text-white ring-4 ring-base-400">
                    <.icon name="hero-magnifying-glass" />
                  </span>
                </div>
                <div class="mt-8">
                  <h3 class="text-base font-semibold leading-6 text-primary-content">
                    <a href="#" class="focus:outline-none">
                      <span class="absolute inset-0" aria-hidden="true"></span> <%= gettext("Search") %>
                    </a>
                  </h3>
                  <p class="mt-2 text-sm text-primary-content">
                    <%= gettext("Search Description") %>
                  </p>
                </div>

                <span
                  class="pointer-events-none absolute right-6 top-6 text-gray-300 group-hover:text-gray-400"
                  aria-hidden="true"
                >
                  <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </div>
              <div class="hover:bg-base-300 group relative bg-base-200 p-6 focus-within:ring-2">
                <div>
                  <span class="inline-flex rounded-lg bg-base-300 p-3 text-white ring-4 ring-base-400">
                    <svg
                      class="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                  </span>
                </div>
                <div class="mt-8">
                  <h3 class="text-base font-semibold leading-6 text-primary-content">
                    <a href="#" class="focus:outline-none">
                      <span class="absolute inset-0" aria-hidden="true"></span> Schedule a one-on-one
                    </a>
                  </h3>
                  <p class="mt-2 text-sm text-primary-content">
                    Doloribus dolores nostrum quia qui natus officia quod et dolorem. Sit repellendus qui ut at blanditiis et quo et molestiae.
                  </p>
                </div>
                <span
                  class="pointer-events-none absolute right-6 top-6 text-gray-300 group-hover:text-gray-400"
                  aria-hidden="true"
                >
                  <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </div>
              <div class="hover:bg-base-300 group relative bg-base-200 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                <div>
                  <span class="inline-flex rounded-lg bg-base-300 p-3 text-white ring-4 ring-base-400">
                    <svg
                      class="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                      />
                    </svg>
                  </span>
                </div>
                <div class="mt-8">
                  <h3 class="text-base font-semibold leading-6 text-primary-content">
                    <a href="#" class="focus:outline-none">
                      <span class="absolute inset-0" aria-hidden="true"></span> Payroll
                    </a>
                  </h3>
                  <p class="mt-2 text-sm text-primary-content">
                    Doloribus dolores nostrum quia qui natus officia quod et dolorem. Sit repellendus qui ut at blanditiis et quo et molestiae.
                  </p>
                </div>
                <span
                  class="pointer-events-none absolute right-6 top-6 text-gray-300 group-hover:text-gray-400"
                  aria-hidden="true"
                >
                  <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
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

    {:ok,
     socket
     |> assign(:tabs, tabs)
     |> assign(:selected_tabs, List.duplicate(nil, Enum.count(tabs)))}
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
           Enum.member?(selected_tabs, tab.id) || is_nil(tab)
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
     |> assign(:selected_tabs, selected_tabs)}
  end

  def handle_event(
        "tab_dropped",
        %{
          "tab" => tab_id,
          "target_group_index" => target_group_index
        },
        socket
      ) do
    {tab_id, _r} = Integer.parse(tab_id)
    {target_group_index, _r} = Integer.parse(target_group_index)

    tab = socket.assigns.tabs |> List.flatten() |> Enum.find(fn t -> t.id == tab_id end)

    tabs =
      socket.assigns.tabs
      |> Enum.map(fn tabs ->
        Enum.filter(tabs, fn tab -> tab.id != tab_id end)
      end)
      |> Enum.with_index()
      |> Enum.map(fn {tabs, index} ->
        if index == target_group_index do
          [tab | tabs]
        else
          tabs
        end
      end)

    save_tabs(tabs, socket)

    if socket.assigns.selected_tabs && socket.assigns.selected_tabs != [] do
      {:noreply,
       socket
       |> assign(:tabs, tabs)
       |> assign(
         :selected_tabs,
         Enum.filter(socket.assigns.selected_tabs, fn t ->
           if t do
             t.id != tab_id
           else
             nil
           end
         end)
       )
       |> push_patch(to: ~p"/")}
    else
      {:noreply, socket |> assign(:tabs, tabs) |> push_patch(to: ~p"/")}
    end
  end

  def handle_event("new_pane", _unsigned_params, socket) do
    tabs = socket.assigns.tabs ++ [[]]
    save_tabs(tabs, socket)
    {:noreply, socket |> assign(:tabs, tabs)}
  end

  def handle_event("close_pane", %{"group-index" => group_index}, socket) do
    {group_index, _r} = Integer.parse(group_index)
    {closed, tabs} = List.pop_at(socket.assigns.tabs, group_index)

    save_tabs(tabs, socket)

    if closed != [] && tabs != [] do
      tabs = tabs |> List.replace_at(0, List.first(tabs) ++ closed)

      save_tabs(tabs, socket)
      {:noreply, socket |> assign(:tabs, tabs)}
    else
      {:noreply, socket |> assign(:tabs, tabs)}
    end
  end

  def handle_event("add_tab", %{"group" => group_index}, socket) do
    {group_index, _r} = Integer.parse(group_index)

    selected_tabs =
      socket.assigns.selected_tabs
      |> Enum.filter(fn selected_tab ->
        !Enum.member?(Enum.fetch!(socket.assigns.tabs, group_index), selected_tab)
      end)

    {:noreply,
     socket
     |> assign(:selected_tabs, selected_tabs)}
  end

  def handle_event("close_tab", %{"tab-id" => tab_id}, socket) do
    {tab_id, _r} = Integer.parse(tab_id)
    close_tab(tab_id, socket)
  end

  def handle_event("open_tab", %{"group" => group_index, "tab" => tab_module}, socket) do
    {group_index, _r} = Integer.parse(group_index)
    tab_module = String.to_existing_atom(tab_module)

    {:ok, new_tab} =
      Common.create_explorer_tabs_for_user(socket.assigns.current_user, %{
        module: tab_module,
        state: %{}
      })

    # for some reason the module doesn't get set correctly
    new_tab = Common.get_explorer_tabs!(new_tab.id)

    tabs =
      socket.assigns.tabs
      |> Enum.with_index()
      |> Enum.map(fn {group, index} ->
        if index == group_index do
          [new_tab | group]
        else
          group
        end
      end)

    save_tabs(tabs, socket)

    {:noreply,
     socket
     |> assign(:tabs, tabs)
     |> assign(
       :selected_tabs,
       List.replace_at(socket.assigns.selected_tabs, group_index, new_tab)
     )
     |> push_patch(to: ~p"/")}
  end

  # handles a call from one of the tabs to close it - we will take it out of the tabs list
  # and update that on the user to avoid re-opening
  def handle_info({:close_tab, tab_id}, socket) do
    close_tab(tab_id, socket)
  end

  def handle_info({:tab_updated, tab_id}, socket) do
    {:noreply, socket |> replace_tab(Common.get_user_tab!(socket.assigns.current_user, tab_id))}
  end

  # handles a call from a module who wants to open a module in a new tab but different grouping
  def handle_info({:open_tab, tab_module, state, group_index}, socket) do
    group_index =
      if group_index > 0 do
        group_index - 1
      else
        group_index
      end

    {:ok, new_tab} =
      Common.create_explorer_tabs_for_user(socket.assigns.current_user, %{
        module: tab_module,
        state: state
      })

    # for some reason the module doesn't get set correctly
    new_tab = Common.get_explorer_tabs!(new_tab.id)

    tabs =
      socket.assigns.tabs
      |> Enum.with_index()
      |> Enum.map(fn {group, index} ->
        if index == group_index do
          [new_tab | group]
        else
          group
        end
      end)

    save_tabs(tabs, socket)

    {:noreply,
     socket
     |> assign(:tabs, tabs)
     |> assign(
       :selected_tabs,
       List.replace_at(socket.assigns.selected_tabs, group_index, new_tab)
     )
     |> push_patch(to: ~p"/")}
  end

  defp replace_tab(socket, tab) do
    tabs =
      socket.assigns.tabs
      |> Enum.map(fn g ->
        Enum.map(g, fn t ->
          if t.id == tab.id do
            tab
          else
            t
          end
        end)
      end)

    selected_tabs =
      socket.assigns.selected_tabs
      |> Enum.map(fn t ->
        if t && t.id == tab.id do
          tab
        else
          t
        end
      end)

    socket |> assign(:tabs, tabs) |> assign(:selected_tabs, selected_tabs)
  end

  defp close_tab(tab_id, socket) do
    tabs =
      socket.assigns.tabs
      |> Enum.map(fn group -> Enum.filter(group, fn t -> t.id != tab_id end) end)

    save_tabs(tabs, socket)

    if socket.assigns.selected_tabs && socket.assigns.selected_tabs != [] do
      {:noreply,
       socket
       |> assign(:tabs, tabs)
       |> assign(
         :selected_tabs,
         Enum.map(socket.assigns.selected_tabs, fn t ->
           if t && t.id != tab_id do
             t
           else
             nil
           end
         end)
       )
       |> push_patch(to: ~p"/")}
    else
      {:noreply, socket |> assign(:tabs, tabs)}
    end
  end

  defp save_tabs(tabs, socket) do
    Datum.Accounts.update_user_open_tabs(
      socket.assigns.current_user,
      tabs |> Enum.map(fn group -> group |> Enum.map(fn tab -> tab.id end) end)
    )
  end

  defp closed_tabs(group_index, selected_tabs, tabs) do
    selected_tabs
    |> Enum.filter(fn selected_tab ->
      Enum.member?(Enum.fetch!(tabs, group_index), selected_tab)
    end) == []
  end
end
