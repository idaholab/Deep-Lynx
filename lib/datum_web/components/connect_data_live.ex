defmodule DatumWeb.LiveComponent.ConnectData do
  @moduledoc """
  This is used to connect two pieces of data, even between separate origins. This is used
  to create connections in the relationships field of %Data{} not connecting in the directory/file
  paradigm
  """
  # In Phoenix apps, the line is typically: use MyAppWeb, :live_component
  use DatumWeb, :live_component
  use Gettext, backend: DatumWeb.Gettext

  alias Datum.DataOrigin

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <div class="bg-white">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <p class="mx-auto mt-6 max-w-2xl text-pretty text-center text-lg font-medium text-gray-600 sm:text-xl/8">
            Create connections between data.
          </p>
          <div class="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <div class="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 lg:mt-8 lg:rounded-r-none xl:p-10">
              <div>
                <div class="flex items-center justify-between gap-x-4">
                  <h3 id="tier-freelancer" class="text-lg/8 font-semibold text-gray-900">
                    Incoming Data: {@incoming_data.path}
                  </h3>
                </div>
                <p class="mt-4 text-sm/6 text-gray-600">
                  {@incoming_data.description}
                </p>
                <ul
                  :if={@incoming_data.properties}
                  }
                  role="list"
                  class="mt-8 space-y-3 text-sm/6 text-gray-600"
                >
                  <li :for={{key, _value} <- @incoming_data.properties} class="flex gap-x-3">
                    <.icon name="hero-arrow-right" /> {key}
                  </li>
                </ul>
              </div>
            </div>
            <div class="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 lg:z-10 lg:rounded-b-none xl:p-10">
              <.simple_form phx-target={@myself} for={@form} class="" phx-submit="create_connection">
                <div>
                  <h3 id="tier-startup" class="text-lg/8 font-semibold text-indigo-600">
                    <label for="direction_select" class="block text-sm font-semibold w-full ">
                      {gettext("Connection Direction")}
                    </label>
                    <.input
                      id="direction_select"
                      type="select"
                      field={@form[:direction]}
                      options={[
                        {"<-------> Bi-directional", :bidirectional},
                        {"<-------- Incoming", :incoming},
                        {"--------> Outgoing", :outgoing}
                      ]}
                    />
                  </h3>
                  <p class="mt-4 text-sm/6 text-gray-600">
                    DeepLynx uses a directed graph - meaning you need to assign your connection a specific direction, or choose the bi-directional arrow if it doesn't matter.
                  </p>
                  <p class="mt-6 flex items-baseline gap-x-1">
                    <label
                      for="relationship_name"
                      class="block text-sm font-semibold w-full text-black "
                    >
                      {gettext("Relationship Name")}
                      <p class="mt-4 text-xs text-gray-600">
                        *Optional
                      </p>
                    </label>
                    <.input id="relationship_name" type="text" field={@form[:name]} />
                  </p>
                  <p class="mt-4 text-sm/6 text-gray-600">
                    A one to two word name for the relationship - try and keep the name lowercase and avoid spaces if possible (e.g "decomposed-by" vs. "decomposed by").
                  </p>
                </div>
                <.button
                  type="submit"
                  phx-disable-with="Connecting..."
                  aria-describedby="tier-startup"
                  class="mt-8 block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Connect
                </.button>
              </.simple_form>
            </div>
            <div class="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 lg:mt-8 lg:rounded-l-none xl:p-10">
              <div>
                <div class="flex items-center justify-between gap-x-4">
                  <h3 id="tier-enterprise" class="text-lg/8 font-semibold text-gray-900">
                    Target Data: {@target_data.path}
                  </h3>
                </div>
                <p class="mt-4 text-sm/6 text-gray-600">
                  {@target_data.description}
                </p>
                <ul
                  :if={@target_data.properties}
                  role="list"
                  class="mt-8 space-y-3 text-sm/6 text-gray-600"
                >
                  <li :for={{key, _value} <- @target_data.properties} class="flex gap-x-3">
                    <.icon name="hero-arrow-right" /> {key}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    """
  end

  @impl true
  def update(assigns, socket) do
    socket = socket |> assign(assigns) |> assign(:form, to_form(%{"direction" => nil}))

    target_origin =
      DataOrigin.get_data_orgins_user(assigns.current_user, assigns.target_origin)

    incoming_origin =
      DataOrigin.get_data_orgins_user(assigns.current_user, assigns.incoming_origin)

    if target_origin && incoming_origin do
      target_data =
        DataOrigin.get_data_user(target_origin, assigns.current_user, assigns.target_data)

      incoming_data =
        DataOrigin.get_data_user(incoming_origin, assigns.current_user, assigns.incoming_data)

      {:ok,
       socket
       |> assign(:incoming_data, incoming_data)
       |> assign(:target_data, target_data)
       |> assign(:target_origin, target_origin)
       |> assign(:incoming_origin, incoming_origin)}
    else
      # we assume if they can't see the origin it's because they don't have rights or it doesn't exist
      send(self(), {:flash, :error, "Insufficient Permissions"})
      {:ok, socket |> patch(assigns.patch)}
    end
  end

  @impl true
  def handle_event(
        "create_connection",
        %{"direction" => direction, "name" => name} = _params,
        socket
      ) do
    case direction do
      "incoming" ->
        # pattern matching will be enough for the error handling in this case as the parent live view 
        # will handle a crashed component just fine
        {:ok, _} =
          DataOrigin.add_relationship(
            {socket.assigns.incoming_data, socket.assigns.incoming_origin},
            {socket.assigns.target_data, socket.assigns.target_origin},
            type: name
          )

      "outgoing" ->
        {:ok, _} =
          DataOrigin.add_relationship(
            {socket.assigns.target_data, socket.assigns.target_origin},
            {socket.assigns.incoming_data, socket.assigns.incoming_origin},
            type: name
          )

      "bidirectional" ->
        {:ok, _r} =
          DataOrigin.add_relationship(
            {socket.assigns.target_data, socket.assigns.target_origin},
            {socket.assigns.incoming_data, socket.assigns.incoming_origin},
            type: name
          )

        {:ok, _} =
          DataOrigin.add_relationship(
            {socket.assigns.incoming_data, socket.assigns.incoming_origin},
            {socket.assigns.target_data, socket.assigns.target_origin},
            type: name
          )
    end

    send(self(), {:flash, :info, "Data Connected Successfully"})
    {:noreply, socket |> patch(socket.assigns.patch)}
  end

  def patch(socket, to) do
    GenServer.call(socket.assigns.parent, {:patch, to})
    socket
  end
end
