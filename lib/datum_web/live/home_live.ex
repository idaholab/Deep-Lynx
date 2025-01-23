defmodule DatumWeb.HomeLive do
  @moduledoc """
  This is the main navigation area after a user logs in. Consists of multiple panes of tabs, each
  tab should be its own separate live_view. Try to do as little as possible on this page, though it
  will probably get more complicated as we add inter-view communication.
  """
  use DatumWeb, :live_view
  use Gettext, backend: DatumWeb.Gettext

  alias Datum.Common

  @impl true
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
              {Map.get(tab.state, "name", tab.module.display_name())}
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
            {live_render(
              @socket,
              Enum.find(tab_group, fn tab -> Enum.member?(@selected_tabs, tab) end).module,
              id:
                "explorer_tab_#{List.first(Enum.filter(tab_group, fn tab -> Enum.member?(@selected_tabs, tab) end)).id}",
              sticky: false,
              session: %{
                "group_index" => group_index,
                "parent" => self(),
                "tab_id" => Enum.find(tab_group, fn tab -> Enum.member?(@selected_tabs, tab) end).id
              }
            )}
          <% end %>
          <div :if={closed_tabs(group_index, @selected_tabs, @tabs)}>
            <div class="divide-y divide-accent overflow-hidden rounded-lg bg-base-100 shadow sm:grid sm:grid-cols-2 sm:gap-px sm:divide-y-0">
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
                      <span class="absolute inset-0" aria-hidden="true"></span> {gettext(
                        "Explore Data Origins"
                      )}
                    </a>
                  </h3>
                  <p class="mt-2 text-sm text-primary-content">
                    {gettext("Explore Data Origins Description")}
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
                      <span class="absolute inset-0" aria-hidden="true"></span> {gettext("Search")}
                    </a>
                  </h3>
                  <p class="mt-2 text-sm text-primary-content">
                    {gettext("Search Description")}
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
                phx-value-tab="Elixir.DatumWeb.OriginCreationLive"
                class="hover:bg-base-300 group relative bg-base-200 p-6 focus-within:ring-2"
              >
                <div>
                  <span class="inline-flex rounded-lg bg-base-300 p-3 text-white ring-4 ring-base-400">
                    <.icon name="hero-plus-circle" class="size-xs" />
                  </span>
                </div>
                <div class="mt-8">
                  <h3 class="text-base font-semibold leading-6 text-primary-content">
                    <a href="#" class="focus:outline-none">
                      <span class="absolute inset-0" aria-hidden="true"></span> {gettext("Add Data Origin")}
                    </a>
                  </h3>
                  <p class="mt-2 text-sm text-primary-content">
                    {gettext("Create and configure a new data origin.")}
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
                :if={Application.get_env(:datum, :openai_enabled)}
                phx-click="open_tab"
                phx-value-group={group_index}
                phx-value-tab="Elixir.DatumWeb.AgentLive"
                class="hover:bg-base-300 group relative bg-base-200 p-6 focus-within:ring-2"
              >
                <div>
                  <span class="inline-flex rounded-lg bg-base-300 p-3 text-white ring-4 ring-base-400">
                    <.icon name="hero-chat-bubble-left-right" />
                  </span>
                </div>
                <div class="mt-8">
                  <h3 class="text-base font-semibold leading-6 text-primary-content">
                    <a href="#" class="focus:outline-none">
                      <span class="absolute inset-0" aria-hidden="true"></span> {gettext(
                        "Chat with an AI Assistant"
                      )}
                    </a>
                  </h3>
                  <p class="mt-2 text-sm text-primary-content">
                    {gettext("Chat with an AI Assistant Description")}
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

  @impl true
  def mount(_params, _session, socket) do
    # get a list of open tabs on the user, fetch from the DB - no sorting necessary
    # this is loaded directly in the middleware and refreshed on navigation
    open_tabs = socket.assigns.current_user.open_explorer_tabs
    tabs = Common.list_open_tabs(socket.assigns.current_user, List.flatten(open_tabs))

    # grouping is essential as it tells the view how many panes to render - so tabs is a multi-dimensional
    # array where each outer array represents a group of tabs and controls how many panes are rendered
    tabs =
      open_tabs
      |> Enum.map(fn ots -> tabs |> Enum.filter(fn tab -> Enum.member?(ots, tab.id) end) end)

    {:ok,
     socket
     |> assign(:tabs, tabs)
     # so we want to immediately set the :selected_tabs to an array who's values are nil
     # but who's size matches the amount of "panes" available
     |> assign(:selected_tabs, List.duplicate(nil, Enum.count(tabs)))}
  end

  # this handle_params/3 will propagate a patch downwards to the tab by id. This allows us to trigger changes on
  # child liveviews without having to rerender them - and without having access to their own handle_params/3 function
  # for more information see the wiki - /wiki/home_liveview_and_tab_system
  #
  # this will be sent as a message to the child LiveView with the body of {:patch, params, uri}
  @impl true
  def handle_params(%{"tab_id" => tab_id} = params, uri, socket) do
    {tab_id, _r} = Integer.parse(tab_id)

    socket =
      if !Enum.any?(socket.assigns.selected_tabs, fn selected ->
           selected && selected.id == tab_id
         end) do
        {:noreply, socket} =
          handle_event("open_tab", %{"tab" => "#{tab_id}", "group-index" => "0"}, socket)

        socket
      else
        socket
      end

    # we're going to use Registry.dispatch/4 instead of just a lookup for the PID  - this is safer and will provide a no-op
    # path of the tab_id doesn't exist - basically sends the patch message and propagates the params and uri downwards to the tab
    # if it exists
    Registry.dispatch(DatumWeb.TabRegistry, tab_id, fn entries ->
      for {pid, _module} <- entries do
        GenServer.cast(pid, {:patch, params, uri, socket.assigns.live_action})
        send(pid, {:patch, params, uri, socket.assigns.live_action})
      end
    end)

    {:noreply, socket}
  end

  # we need this here as a fallback in case of badly formatted params as well as handling already open tabs
  # eventually we will want to build functionality that parses the parameters and passes it to a relevant tab
  # allowing the nested liveviews to run patch operations
  @impl true
  def handle_params(params, uri, socket) do
    # we have to propagate the patch to all tabs if it's a general patch request
    # not just a single one (else it'd match above)
    Enum.map(
      List.flatten(socket.assigns.tabs),
      &Registry.dispatch(DatumWeb.TabRegistry, &1.id, fn entries ->
        for {pid, _module} <- entries do
          GenServer.cast(pid, {:patch, params, uri, socket.assigns.live_action})
          send(pid, {:patch, params, uri, socket.assigns.live_action})
        end
      end)
    )

    {:noreply, socket}
  end

  # handles opening a new tab which already exists
  @impl true
  def handle_event("open_tab", %{"tab" => tab_id, "group-index" => group_index}, socket) do
    # unfortunately we session params are all strings, and tab ids are ints
    {group_index, _} = Integer.parse(group_index)
    {tab_id, _} = Integer.parse(tab_id)

    new_tab = Enum.find(List.flatten(socket.assigns.tabs), fn t -> t.id == tab_id end)

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

  # this handles when a tab has been dragged from a pane and dropped into the same or different pane
  @impl true
  def handle_event(
        "tab_dropped",
        %{
          "tab" => tab_id,
          "target_group_index" => target_group_index
        },
        socket
      ) do
    # again, get the ints
    {tab_id, _r} = Integer.parse(tab_id)
    {target_group_index, _r} = Integer.parse(target_group_index)

    # get the tab being manipulated
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

  @impl true
  def handle_event("new_pane", _unsigned_params, socket) do
    tabs = socket.assigns.tabs ++ [[]]
    save_tabs(tabs, socket)
    {:noreply, socket |> assign(:tabs, tabs)}
  end

  @impl true
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

  @impl true
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

  @impl true
  def handle_event("close_tab", %{"tab-id" => tab_id}, socket) do
    {tab_id, _r} = Integer.parse(tab_id)
    close_tab(tab_id, socket)
  end

  @impl true
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

    # set the new tab order by moving (possibly) the tab out of its old group into its new
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

    # this ensures the move is persisted
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

  # handle_info/2 is what handles messages from the child LiveView to this parent
  #
  # closes a tab on request
  @impl true
  def handle_info({:close_tab, tab_id}, socket) do
    close_tab(tab_id, socket)
  end

  # we need a way to have child live views initiate a patch since that doesn't exist when
  # not mounted at the router
  @impl true
  def handle_info({:patch, to}, socket) do
    {:noreply, socket |> push_patch(to: to)}
  end

  # updates the tab on the socket by fetching the latest from the database - in case we want
  @impl true
  def handle_info({:tab_updated, tab_id}, socket) do
    {:noreply, socket |> replace_tab(Common.get_user_tab!(socket.assigns.current_user, tab_id))}
  end

  # messages for opening a tab in a certain index - used to handle tabs requesting a new tab be
  # opened, either in its view or in the opposite pane. e.g the OriginExplorerLive opening GraphExplorerLive
  @impl true
  def handle_info({:open_tab, tab_module, state, group_index}, socket) do
    group_index =
      if group_index > 0 do
        group_index - 1
      else
        group_index
      end

    # create the new tab and save it to the user so we can persist it
    {:ok, new_tab} =
      Common.create_explorer_tabs_for_user(socket.assigns.current_user, %{
        module: tab_module,
        state: state
      })

    # for some reason the module doesn't get set correctly so we have to refetch it
    # from the database so the module name gets converted to an atom safely
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

    # persist the tabs so we can make sure the new one is saved
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

  @impl Phoenix.LiveView
  def handle_call({:patch, to}, _tuple, socket) do
    {:reply, %{}, socket |> push_patch(to: to)}
  end

  @doc """
  This handles calls from tabs wanting to put flashes to the socket - useful as we can't
  patch or put_flash/3 from inside the child live view
  """
  @impl Phoenix.LiveView
  def handle_call({:flash, type, message}, _tuple, socket) do
    {:reply, %{}, socket |> put_flash(type, message)}
  end

  # easy function for replacing the tab with an updated version in the socket
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

  # fully removes the tab from the socket and the user
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

  # drops the current tab information into the user's db record, to save state
  defp save_tabs(tabs, socket) do
    Datum.Accounts.update_user_open_tabs(
      socket.assigns.current_user,
      tabs |> Enum.map(fn group -> group |> Enum.map(fn tab -> tab.id end) end)
    )
  end

  # checks to see if the group's tabs are in the selected_tabs socket var
  defp closed_tabs(group_index, selected_tabs, tabs) do
    selected_tabs
    |> Enum.filter(fn selected_tab ->
      Enum.member?(Enum.fetch!(tabs, group_index), selected_tab)
    end) == []
  end
end
