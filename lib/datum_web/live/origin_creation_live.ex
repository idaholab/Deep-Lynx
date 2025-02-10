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
          <.simple_form for={@form} phx-submit="create_origin" phx-change="validate">
            <.input type="text" field={@form[:data_origin_name]} label={gettext("Data Origin Name")} />

            <.input
              label={gettext("Data Origin Type")}
              type="select"
              field={@form[:type]}
              options={[
                {"AWS S3", :s3},
                {"File system", :filesystem},
                {"Default", :default},
                {"DuckDB Database", :duckdb}
              ]}
            />
            <%!-- <%= if @type == "filesystem" do %> --%>
            <div class="pt-2">
              <.input type="text" field={@form[:path]} label={gettext("Filesystem Path")} />
              <div class="pt-2">
                <.input type="checkbox" field={@form[:watch]} label={gettext("Watch data origin?")} />
              </div>
            </div>
            <%!-- <% end %> --%>

            <button
              :if={!@create_result || @create_result.ok?}
              type="submit"
              class="btn btn-wide mt-5"
            >
              {gettext("Create")}
            </button>
            <button
              :if={@create_result && @create_result.loading}
              type="submit"
              class="btn btn-wide mt-5"
              disabled
            >
              {gettext("Create")}
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
        %{
          "tab_id" => tab_id,
          "user_token" => user_token,
          "parent" => parent_pid,
          "group_index" => group_index
        } =
          _session,
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
         message: "Create data origin config"
       }
     ])
     |> assign(:group_index, group_index)
     |> assign(:parent, parent_pid)
     |> assign(:current_user, user)
     |> assign(:create_result, nil)
     |> assign(:create_result_send, nil)
     |> assign(:form, to_form(%{"data_origin_name" => nil, "type" => nil}))
     |> assign(:tab, tab)
     |> assign(:type, nil)
     |> assign(:id, user.id)}
  end

  @impl true
  def handle_event("close_tab", _unsigned_params, socket) do
    notify_parent({:close_tab, socket.assigns.tab.id}, socket.assigns.parent)
    {:noreply, socket}
  end

  def handle_event(
        "validate",
        %{
          "data_origin_name" => name,
          "type" => type,
          "path" => path,
          "watch" => watch
        },
        socket
      ) do
    changeset =
      Datum.DataOrigin.change_origin(%Origin{}, %{
        name: name,
        type: type,
        config: %{path: path, watch: watch}
      })

    {:noreply,
     socket
     |> assign(:type, type)
     |> assign_form(Map.put(changeset, :action, :validate))}
  end

  # this sends the user's input to the create a data origin
  @impl true
  def handle_event(
        "create_origin",
        %{
          "data_origin_name" => name,
          "type" => type,
          "path" => path,
          "watch" => watch
        },
        socket
      ) do
    if !name do
      {:noreply, socket |> put_flash(:error, gettext("Please type data origin type"))}
    else
      # Compiler doesn't like including these full socket.assigns in the assign_async
      user_id = socket.assigns.current_user.id
      parent_id = socket.assigns.parent
      group_index = socket.assigns.group_index

      {:noreply,
       socket
       |> assign_async(:create_result, fn ->
         {:ok,
          %{
            create_result:
              Datum.DataOrigin.create_origin(%{
                name: name,
                type: type,
                owned_by: user_id,
                config: %{path: path, watch: watch}
              }),
            create_result_send:
              send(
                parent_id,
                {:open_tab, DatumWeb.OriginExplorerLive, %{}, group_index}
              )
          }}
       end)
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
