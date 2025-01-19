defmodule DatumWeb.LiveComponent.ConnectData do
  # In Phoenix apps, the line is typically: use MyAppWeb, :live_component
  use DatumWeb, :live_component
  use Gettext, backend: DatumWeb.Gettext

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
                    Incoming Data
                  </h3>
                </div>
                <p class="mt-4 text-sm/6 text-gray-600">
                  Data Description
                </p>
                <ul role="list" class="mt-8 space-y-3 text-sm/6 text-gray-600">
                  <li class="flex gap-x-3">
                    <.icon name="hero-arrow-right" /> Property one
                  </li>
                </ul>
              </div>
            </div>
            <div class="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 lg:z-10 lg:rounded-b-none xl:p-10">
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
              <a
                href="#"
                aria-describedby="tier-startup"
                class="mt-8 block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Connect
              </a>
            </div>
            <div class="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 lg:mt-8 lg:rounded-l-none xl:p-10">
              <div>
                <div class="flex items-center justify-between gap-x-4">
                  <h3 id="tier-enterprise" class="text-lg/8 font-semibold text-gray-900">
                    Outgoing Data
                  </h3>
                </div>
                <p class="mt-4 text-sm/6 text-gray-600">
                  Outgoing data description
                </p>
                <ul role="list" class="mt-8 space-y-3 text-sm/6 text-gray-600">
                  <li class="flex gap-x-3">
                    <.icon name="hero-arrow-right" /> Property one
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
    {:ok, socket |> assign(assigns) |> assign(:form, to_form(%{"direction" => nil}))}
  end
end
