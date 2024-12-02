defmodule DatumWeb.GraphExplorerLive do
  @moduledoc """
  This is the live component for exploring data in a graph like manner. Typically started
  with either one or a group of a data. This component allows users to traverse their data
  in a graph and make connections between pieces of data manually (planned, not currently implemented)
  """
  use DatumWeb, :live_view
  use Gettext, backend: DatumWeb.Gettext

  def display_name, do: gettext("Graph Explorer")
  alias Datum.Common
  alias Datum.DataOrigin

  @impl true
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
        </ul>
      </div>
      <!-- we need to set ignore so that we're not re-rendering the graph from elixir's side -->
      <div
        id={"graph_viewer #{ShortUUID.encode!(UUID.uuid4())}"}
        phx-hook="GraphView"
        phx-update="ignore"
        data-items={Jason.encode!(@items)}
        data-links={Jason.encode!(@links)}
      >
      </div>
    </div>
    """
  end

  @impl true
  def mount(
        _params,
        %{"tab_id" => tab_id, "user_token" => user_token, "parent" => parent_pid} = _session,
        socket
      ) do
    user = Datum.Accounts.get_user_by_session_token(user_token)
    # we don't trust anything that gets sent over the session, so back it all up with the db
    # this also helps us get the latest state object
    tab = Common.get_user_tab(user, tab_id)

    # we only have two keys really - the set of initial items to load, and an optional, focus item
    # items should be a list of tuples only - [data_id, origin_id] - this view should be in charge
    # of actually loading the data and setting up the views
    items = Map.get(tab.state, "items", [])

    {items, links} = add_items(items, user)

    # set what we can here and common practice is to set all your used variables in the socket as
    # nil or empty so we don't cause rendeing errors - actually load them in the params OR load them
    # here with async assigns
    {:ok,
     socket
     |> assign(:parent, parent_pid)
     |> assign(:current_user, user)
     |> assign(:items, items)
     |> assign(:links, links)
     |> assign(:tab, tab)}
  end

  @impl true
  def handle_event("close_tab", _unsigned_params, socket) do
    notify_parent({:close_tab, socket.assigns.tab.id}, socket.assigns.parent)
    {:noreply, socket}
  end

  @impl true
  def handle_event("additional_clicked", %{"id" => id, "origin_id" => origin_id}, socket) do
    # the additional items we send are all the items in the incoming and outgoing relationships
    data =
      DataOrigin.get_data_user(
        DataOrigin.get_data_orgins_user(socket.assigns.current_user, origin_id),
        socket.assigns.current_user,
        id
      )

    {nodes, links} =
      add_items(
        data.outgoing_relationships ++ data.incoming_relationships,
        socket.assigns.current_user,
        original_items: socket.assigns.items
      )

    {:noreply,
     socket
     |> assign(:items, nodes ++ socket.assigns.items)
     |> assign(:links, links ++ socket.assigns.links)
     |> push_event("additional_data", %{nodes: nodes, links: links})}
  end

  defp notify_parent(msg, process), do: send(process, msg)

  # this will take data items and add them into the socket, doing all the work needed
  # to fetch items
  defp add_items(items, user, opts \\ []) do
    # this allows us to reuse the function and do the deduplication step on elixir's
    # side instead of shoving it to the client
    original_items = Keyword.get(opts, :original_items, [])

    items =
      items
      |> Enum.map(fn [data_id, origin_id | _rest] ->
        DataOrigin.get_data_user(
          DataOrigin.get_data_orgins_user(user, origin_id),
          user,
          data_id
        )
      end)
      |> Enum.filter(fn
        nil -> false
        data -> !Enum.any?(original_items, fn o -> o.id == data.id end)
      end)

    # though this is expensive, we need to keep track both of the list with all items and only our new ones
    combined_items = items ++ original_items

    # now we build the linkagages between the nodes that are available. We expect a map with source and target
    # on the frontend for rendering
    links =
      combined_items
      |> Enum.filter(fn
        %DataOrigin.Data{} = _data -> true
        _else -> false
      end)
      |> Enum.flat_map(fn data ->
        outgoing =
          data.outgoing_relationships
          |> Enum.map(fn [data_id, _origin_id | rest] ->
            %{source: data.id, target: data_id, label: Enum.join(rest, ",")}
          end)

        incoming =
          data.incoming_relationships
          |> Enum.map(fn [data_id, _origin_id | rest] ->
            %{source: data_id, target: data.id, label: Enum.join(rest, ",")}
          end)

        incoming ++ outgoing
      end)
      |> Enum.filter(fn %{source: source, target: target} ->
        Enum.find(combined_items, fn item -> item.id == source end) &&
          Enum.find(combined_items, fn item -> item.id == target end)
      end)

    # iterate through the items again - now we're building the nodes in the graph that represent
    # the rest of their connections - note we're looking at the combined items for matches to make
    # sure we're nto duplicating any items
    {additional_items, addtional_links} =
      items
      |> Enum.filter(fn
        %DataOrigin.Data{} = _data -> true
        _else -> false
      end)
      |> Enum.map(fn data ->
        remaining_outgoing =
          data.outgoing_relationships
          |> Enum.count(fn [data_id, _origin_id | _rest] ->
            !Enum.any?(combined_items, fn item -> item.id == data_id end)
          end)

        remaining_incoming =
          data.incoming_relationships
          |> Enum.count(fn [data_id, _origin_id | _rest] ->
            !Enum.any?(combined_items, fn item -> item.id == data_id end)
          end)

        total = remaining_incoming + remaining_outgoing

        if total > 0 do
          {%{
             id: "#{data.id}-connections",
             original_id: data.id,
             path: "#{total} #{gettext("additional connection(s)")}",
             origin_id: data.origin_id,
             type: "additional"
           },
           %{
             source: data.id,
             target: "#{data.id}-connections",
             label: ""
           }}
        else
          {nil, nil}
        end
      end)
      |> Enum.filter(fn
        {nil, nil} -> false
        _data -> true
      end)
      |> Enum.unzip()

    {items ++ additional_items, links ++ addtional_links}
  end

  # TODO: we need to include the update state functionality in this module at some point
end
