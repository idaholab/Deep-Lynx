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

  def render(assigns) do
    ~H"""
    <div>
      <div class="breadcrumbs text-sm">
        <ul>
          <li><a>Data Origins</a></li>
        </ul>
      </div>
      <div>
        <span :if={@origins.loading} class="loading loading-bars loading-lg mx-auto"></span>
        <div :if={origins = @origins.ok? && @origins.result}>
          <.file_table
            id={"origins_#{@tab.id}"}
            rows={origins}
            row_click={fn _ -> JS.push("test") end}
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
      # set what we can here and common practice is ot set all your used variables in the socket as
      # nil or empty so we don't cause rendeing errors - actually load them in the params OR load them
      # here with async assigns
      {:ok,
       socket
       |> assign(:parent, parent_pid)
       |> assign(:current_user, user)
       |> assign(:tab, tab)
       |> assign_async(:origins, fn ->
         {:ok, %{origins: Datum.DataOrigin.list_data_orgins_user(user)}}
       end)}
    end
  end

  def handle_event("test", unsigned_params, socket) do
    update_state(socket, %{name: "test"})

    {:noreply, socket}
  end

  def update_state(socket, state) do
    # this helps us validate it's a tab that hasn't been closed
    tab = Common.get_user_tab!(socket.assigns.current_user, socket.assigns.tab.id)

    {:ok, _} = Common.update_explorer_tabs(tab, %{state: state})
    notify_parent({:tab_updated, tab.id}, socket.assigns.parent)
  end

  defp notify_parent(msg, process), do: send(process, msg)
end
