defmodule DatumWeb.OriginCreationLive do
  @moduledoc """
  This is the tab for adding data.
  """
  use DatumWeb, :live_view
  use Gettext, backend: DatumWeb.Gettext
  require Logger

  def display_name, do: gettext("Add Data")
  alias Datum.Common
  alias Datum.DataOrigin.Origin

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
        <div>
        <.simple_form for={@form} phx-submit="create_origin">
          <%!-- <.input
            disabled
            type="select"
            field={@form[:data_origin_type]}
            options={[{gettext("S3"), "S3"}, {gettext("Azure Blob"), "Azure Blob"}, {gettext("File system"), "File system"}]}
            label={gettext("Select Data Origin Type - Coming Soon!")}
            class="form-select"
          /> --%>
          <.input
            type="text"
            field={@form[:data_origin_name]}
            label={gettext("Data Origin Name")}

          />

            <button :if={!@waiting} type="submit" class="btn btn-wide mt-5">
              <%= gettext("Create") %>
            </button>
            <button :if={@waiting} type="submit" class="btn btn-wide mt-5" disabled>
              <%= gettext("Create") %>
            </button>
        </.simple_form>
      </div>
      </div>
    </div>
    """
  end

  @impl true
  def mount(
        _params,
        %{"tab_id" => tab_id, "user_token" => user_token, "parent" => parent_pid, "group_index" => group_index} = _session,
        socket
      ) do
    user = Datum.Accounts.get_user_by_session_token(user_token)
    tab = Common.get_user_tab(user, tab_id)
    case GenServer.start_link(Datum.Agent, %{parent: self(), user: user}, name: {:global, tab_id}) do
      {:ok, pid} ->
        pid

      {:error, {:already_started, pid}} ->
        pid

      {:error, reason} ->
        Logger.error("unable to start an agent: #{reason}")
        nil
    end
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

    {:ok,
     socket
     |> assign(:agent_pid, {:global, tab_id})
     |> assign(:messages, [
       %{
         id: UUID.uuid4(),
         message:
           "Create data origin config"
       }
     ])
     |> assign(:items, items)
     |> assign(:group_index, group_index)
     |> assign(:parent, parent_pid)
     |> assign(:current_user, user)
     |> assign(:waiting, false)
    #  |> assign(:form, to_form(%{"data_origin_type" => nil}))
     |> assign(:form, to_form(%{"data_origin_name" => nil}))
     |> assign(:tab, tab)
     |> assign(:id, user.id)
    }
  end

  @impl true
  def handle_event("close_tab", _unsigned_params, socket) do
    notify_parent({:close_tab, socket.assigns.tab.id}, socket.assigns.parent)
    {:noreply, socket}
  end

  # this sends the user's input to the create a data origin
  @impl true
  def handle_event("create_origin", %{"data_origin_name" => name}, socket) do
    if !name do
      {:noreply, socket |> put_flash(:error, gettext("Please type data origin type"))}
    else
      Process.send_after(self(), {:create_origin, name}, 100)

      {:noreply,
       socket
       |> assign(:waiting, true)
       |> assign(:form, to_form(%{"data_origin_name" => nil}, action: :reset))
       |> assign(
         :messages,
         socket.assigns.messages ++ [%{id: UUID.uuid4(), message: "Submit create"}]
       )}
    end
  end

  @impl true
  def handle_info({:create_origin, name}, socket) do
    Datum.DataOrigin.create_origin((%{
      name: name,
      owned_by: socket.assigns.current_user.id
    }))

    send(
      socket.assigns.parent,
      {:open_tab, DatumWeb.OriginExplorerLive,
       %{
         items: Enum.map(socket.assigns.items, fn item -> [item.id, socket.assigns.origin.id] end)
       }, socket.assigns.group_index}
    )

    {:noreply, socket}
  end

  defp notify_parent(msg, process), do: send(process, msg)

end
