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
          <.input
            type="select"
            field={@form[:data_origin_type]}
            options={[{gettext("S3"), "S3"}, {gettext("Azure Blob"), "Azure Blob"}, {gettext("File system"), "File system"}]}
            label={gettext("Select Data Origin Type")}
            class="form-select"
          />
          <.input
            type="text"
            field={@form[:data_origin_name]}
            label={gettext("Data Origin Name")}

          />

            <button :if={!@waiting} type="submit" class="btn btn-wide mt-5">
              <%= gettext("Send") %>
            </button>
            <button :if={@waiting} type="submit" class="btn btn-wide mt-5" disabled>
              <%= gettext("Send") %>
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
        %{"tab_id" => tab_id, "user_token" => user_token, "parent" => parent_pid} = _session,
        socket
      ) do
    user = Datum.Accounts.get_user_by_session_token(user_token)
    # we don't trust anything that gets sent over the session, so back it all up with the db
    # this also helps us get the latest state object
    tab = Common.get_user_tab(user, tab_id)

    # start the AI agent for this session and supervise it - the ID is the tabid
    case GenServer.start_link(Datum.Agent, %{parent: self(), user: user}, name: {:global, tab_id}) do
      {:ok, pid} ->
        pid

      {:error, {:already_started, pid}} ->
        pid

      {:error, reason} ->
        Logger.error("unable to start an agent: #{reason}")
        nil
    end

    # set what we can here and common practice is to set all your used variables in the socket as
    # nil or empty so we don't cause rendering errors - actually load them in the params OR load them
    # here with async assigns
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
     |> assign(:parent, parent_pid)
     |> assign(:current_user, user)
     |> assign(:waiting, false)
     |> assign(:form, to_form(%{"data_origin_type" => nil}))
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

  # this sends the user's input to the create data origin permission process
  @impl true
  def handle_event("create_origin", %{"data_origin_type" => type, "data_origin_name" => name}, socket) do
    if !name do
      {:noreply, socket |> put_flash(:error, gettext("Please type data origin type"))}
    else
      Process.send_after(self(), {:create_origin, name}, 100)

      {:noreply,
       socket
       |> assign(:waiting, true)
       |> assign(:form, to_form(%{"data_origin_type" => nil}, action: :reset))
       |> assign(:form, to_form(%{"data_origin_name" => nil}, action: :reset))
       |> assign(
         :messages,
         socket.assigns.messages ++ [%{id: UUID.uuid4(), message: "Submit create"}]
       )}
    end
  end

  # we have to do this so we can delay sending the message long enough for the socket to update
  # with the user's message
  @impl true
  def handle_info({:create_origin, name}, socket) do
    case Datum.DataOrigin.create_origin((%{
      name: name
    })) do
      {:ok, origin} ->
        dir_one =
        Datum.DataOrigin.add_data(origin, %{
          path: "root",
          original_path: "/Users/hergna/Development/Data",
          type: :root_directory
        })
        file_one =
        Datum.DataOrigin.add_data!(origin, %{
          path: "data.txt",
          original_path: "/Users/hergna/Development/Data/data.txt",
          type: :file
        })
        Datum.DataOrigin.connect_data(origin, dir_one, dir_one)
        Datum.DataOrigin.connect_data(origin, dir_one, file_one)
        {:noreply, socket}
    end
  end

  defp notify_parent(msg, process), do: send(process, msg)

end
