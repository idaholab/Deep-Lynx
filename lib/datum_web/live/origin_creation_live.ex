defmodule DatumWeb.OriginCreationLive do
  @moduledoc """
  This is the tab for adding data.
  """
  use DatumWeb, :live_view
  use Gettext, backend: DatumWeb.Gettext
  require Logger

  def display_name, do: gettext("Add Data Origin")
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
        <.simple_form
        for={@form}
        phx-submit="create_origin"
        phx-change="validate"
        >
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

            <button :if={!@create_result || @create_result.ok?} type="submit" class="btn btn-wide mt-5">
              <%= gettext("Create") %>
            </button>
            <button :if={@create_result && @create_result.loading} type="submit" class="btn btn-wide mt-5" disabled>
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
        %{"tab_id" => tab_id,
        "user_token" => user_token,
        "parent" => parent_pid,
        "group_index" => group_index}
        = _session,
        socket
      ) do
    user = Datum.Accounts.get_user_by_session_token(user_token)
    tab = Common.get_user_tab(user, tab_id)

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

     |> assign(:group_index, group_index)
     |> assign(:parent, parent_pid)
     |> assign(:current_user, user)
     |> assign(:create_result, nil)
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

  def handle_event("validate", %{"data_origin_name" => data_origin_name}, socket) do
    changeset = Datum.DataOrigin.change_origin(%Origin{}, %{name: data_origin_name})
    {:noreply, assign_form(socket, Map.put(changeset, :action, :validate))}
  end

  # this sends the user's input to the create a data origin
  @impl true
  def handle_event("create_origin", %{"data_origin_name" => name}, socket) do
    if !name do
      {:noreply, socket |> put_flash(:error, gettext("Please type data origin type"))}
    else
      # Compiler doesn't like including these full socket.assigns in the assign_async
      user_id = socket.assigns.current_user.id
      parent_id = socket.assigns.parent
      group_index = socket.assigns.group_index

      {:noreply,
       socket
       |> assign_async(:create_result, fn -> {:ok, %{create_result:
        Datum.DataOrigin.create_origin((%{
          name: name,
          owned_by: user_id
        })), create_result:
        send(
          parent_id,
          {:open_tab, DatumWeb.OriginExplorerLive, %{}, group_index}
        )
        }} end)
      #  |> assign(:form, to_form(%{"data_origin_name" => nil}, action: :reset))
       |> assign(
         :messages,
         socket.assigns.messages ++ [%{id: UUID.uuid4(), message: "Submit create"}]
       )}

    end
  end

  defp assign_form(socket, %Ecto.Changeset{} = changeset) do
    assign(socket, :data_origin_name, to_form(changeset))
  end

  defp notify_parent(msg, process), do: send(process, msg)

end
