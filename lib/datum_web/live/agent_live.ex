defmodule DatumWeb.AgentLive do
  @moduledoc """
  This is the tab for interacting with an AI agent, if the integration is enabled and
  a suitable configuration (like Ollama) is present. Currently we do only support OpenAI
  enabled endpoints (which Ollama supports).
  """
  use DatumWeb, :live_view
  use Gettext, backend: DatumWeb.Gettext
  require Logger

  def display_name, do: gettext("AI Assistant")
  alias Datum.Common

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
      <div :for={message <- @messages} id={message.id}>
        <div :if={message.origin == :ai} class="chat chat-start">
          <div class="chat-bubble chat-bubble-primary">
            {message.message}
          </div>
        </div>
        <div :if={message.origin == :user} class="chat chat-end">
          <div class="chat-bubble">{message.message}</div>
        </div>
      </div>
      <span :if={@waiting} class="loading loading-bars loading-lg"></span>
      <div>
        <.simple_form for={@form} phx-submit="send_message">
          <.input field={@form[:user_input]} type="textarea" />
          <button :if={!@waiting} type="submit" class="btn btn-wide mt-5"> <%= gettext(
                        "Send"
                      ) %></button>
          <button :if={@waiting} type="submit" class="btn btn-wide mt-5" disabled> <%= gettext(
                        "Send"
                      ) %></button>
        </.simple_form>
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
    # nil or empty so we don't cause rendeing errors - actually load them in the params OR load them
    # here with async assigns
    {:ok,
     socket
     |> assign(:agent_pid, {:global, tab_id})
     |> assign(:messages, [
       %{
         id: UUID.uuid4(),
         message:
           "I am DeepLynx's friendly AI assistant! Please feel free to ask me any questions about your data.",
         origin: :ai
       }
     ])
     |> assign(:parent, parent_pid)
     |> assign(:current_user, user)
     |> assign(:waiting, false)
     |> assign(:form, to_form(%{"user_input" => nil}))
     |> assign(:tab, tab)}
  end

  @impl true
  def handle_event("close_tab", _unsigned_params, socket) do
    notify_parent({:close_tab, socket.assigns.tab.id}, socket.assigns.parent)
    {:noreply, socket}
  end

  # this sends the user's message/query to the AI agent process - note that its an
  # async operation, we listen for an incoming message in a handle_info/3 process
  @impl true
  def handle_event("send_message", %{"user_input" => input}, socket) do
    if !input || input == "" do
      {:noreply, socket |> put_flash(:error, gettext("Message to assistant cannot be blank"))}
    else
      Process.send_after(self(), {:send_message, input}, 100)

      {:noreply,
       socket
       |> assign(:waiting, true)
       |> assign(:form, to_form(%{"user_input" => nil}, action: :reset))
       |> assign(
         :messages,
         socket.assigns.messages ++ [%{id: UUID.uuid4(), message: input, origin: :user}]
       )}
    end
  end

  # handles a response from the AI agent genserver, typically in the form of a message struct
  # eventually we will do more complex operations depending on the message received - for now though
  # just append it and move on.
  @impl true
  def handle_info({:new_message, message}, socket) do
    {:noreply,
     socket
     |> assign(:waiting, false)
     |> assign(:messages, socket.assigns.messages ++ [message])}
  end

  # we have to do this so we can delay sending the message long enough for the socket to update
  # with the user's message
  @impl true
  def handle_info({:send_message, message}, socket) do
    Datum.Agent.send_message(socket.assigns.agent_pid, message)
    {:noreply, socket}
  end

  defp notify_parent(msg, process), do: send(process, msg)
end
