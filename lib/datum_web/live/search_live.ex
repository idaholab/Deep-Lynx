defmodule DatumWeb.SearchLive do
  @moduledoc """
  This is our tab for running searches across the entirety of the Datum ecosystem.
  If state exists, only hold the state of the query itself and filters.

  This should not embed any additional live views - only components. If you
  need to build a live view, let's say a FileViewLive or something, then you
  should message the parent to spawn the relevant tab - not spawn and save it
  """
  use DatumWeb, :live_view

  def display_name, do: "Search"
  alias Datum.Common
  use Gettext, backend: DatumWeb.Gettext

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
          <li>
            <a phx-click="home_navigate">
              <.icon name="hero-magnifying-glass" class="mr-1 h-3 w-3" /><%= gettext("Search") %>
            </a>
          </li>
          <li :if={@results != []}>
            <a phx-click="select_results">
              <.icon name="hero-list-bullet" class="mr-1 h-3 w-3" /><%= gettext("Results") %>
            </a>
          </li>
          <li :if={@selected}>
            <span>
              <.icon name="hero-document" class="mr-1 h-3 w-3" />
            </span>
            <%= Map.get(@selected, :path, gettext("Result Item")) %>
          </li>
        </ul>
      </div>
      <div>
        <.simple_form for={@form} phx-change="search">
          <.input field={@form[:query]} label="Search Term(s)" type="search" />
        </.simple_form>
      </div>

      <div class="mx-auto max-w-md sm:max-w-3xl">
        <div>
          <form class="mt-6 sm:flex sm:items-center" action="#">
            <label for="emails" class="sr-only">Email addresses</label>
            <div class="grid grid-cols-1 sm:flex-auto">
              <input
                type="text"
                name="emails"
                id="emails"
                class="peer relative col-start-1 row-start-1 border-0 bg-transparent py-1.5 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm/6"
                placeholder="Enter an email"
              />
              <div
                class="col-start-1 col-end-3 row-start-1 rounded-md shadow-sm ring-1 ring-inset ring-gray-300 peer-focus:ring-2 peer-focus:ring-indigo-600"
                aria-hidden="true"
              >
              </div>
              <div class="col-start-2 row-start-1 flex items-center">
                <span class="h-4 w-px flex-none bg-gray-200" aria-hidden="true"></span>
                <label for="role" class="sr-only">Role</label>
                <select
                  id="role"
                  name="role"
                  class="rounded-md border-0 bg-transparent py-1.5 pl-4 pr-7 text-gray-900 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6"
                >
                  <option>Can edit</option>
                  <option>Can view</option>
                </select>
              </div>
            </div>
            <div class="mt-3 sm:ml-4 sm:mt-0 sm:shrink-0">
              <button
                type="submit"
                class="block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="divider">Results</div>

      <div class="text-center">
        <svg
          class="mx-auto size-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            vector-effect="non-scaling-stroke"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>
        <h3 class="mt-2 text-sm font-semibold ">No results</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by typing a query.</p>
      </div>

      <ul :for={data <- @results} role="list" class="divide-y divide-white/5">
        <li
          class="relative flex items-center space-x-4 py-4 cursor-pointer hover:bg-neutral px-5"
          phx-click="select_result"
          phx-value-result={data.id}
        >
          <div class="min-w-0 flex-auto">
            <div
              class="flex items-center gap-x-3 tooltip tooltip-left"
              data-tip={
                if is_nil(data.in_compliance) do
                  gettext("No Metadata")
                else
                  if data.in_compliance do
                    gettext("In Compliance")
                  else
                    gettext("Out of Compliance")
                  end
                end
              }
            >
              <div
                :if={is_nil(data.in_compliance)}
                class="flex-none rounded-full bg-gray-100/10 p-1 text-gray-500 "
              >
                <div class="size-2 rounded-full bg-current"></div>
              </div>

              <div
                :if={data.in_compliance}
                class="flex-none rounded-full bg-green-400/10 p-1 text-green-400"
              >
                <div class="size-2 rounded-full bg-current"></div>
              </div>

              <div
                :if={data.in_compliance == false}
                class="flex-none rounded-full bg-rose-400/10 p-1 text-rose-400"
              >
                <div class="size-2 rounded-full bg-current"></div>
              </div>
              <h2 class="min-w-0 text-sm/6 font-semibold text-white">
                <a href="#" class="flex gap-x-2">
                  <span :if={data.type == :directory || data.type == :root_directory}>
                    <.icon name="hero-folder" class="mr-1 h-3 w-3" />
                  </span>

                  <span :if={data.type == :file}>
                    <.icon name="hero-document" class="mr-1 h-3 w-3" />
                  </span>

                  <span :if={data.type == :person}>
                    <.icon name="hero-user" class="mr-1 h-3 w-3" />
                  </span>

                  <span :if={data.type == :organization}>
                    <.icon name="hero-user-group" class="mr-1 h-3 w-3" />
                  </span>
                  <span class="truncate"><%= data.path %></span>
                  <span class="text-gray-400">/</span>
                  <span class="whitespace-nowrap"><%= data.origin.name %></span>
                  <span class="absolute inset-0"></span>
                </a>
              </h2>
            </div>
            <div class="mt-3 flex items-center gap-x-2.5 text-xs/5 text-gray-400">
              <p :if={data.description} class="truncate"><%= data.description %></p>
              <p :if={!data.description} class="truncate">
                <%= gettext("Data has no description") %>
              </p>
              <svg viewBox="0 0 2 2" class="size-0.5 flex-none fill-gray-300">
                <circle cx="1" cy="1" r="1" />
              </svg>
              <p class="whitespace-nowrap">
                <%= "#{data.inserted_at.month}/#{data.inserted_at.day}/#{data.inserted_at.year}" %>
              </p>
            </div>
          </div>
          <span :if={data.tags}>
            <div :for={tag <- Enum.take(data.tags, 4)}>
              <div class="flex-none rounded-full bg-gray-400/10 my-2 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-400/20">
                <%= tag %>
              </div>
            </div>
          </span>
          <span :if={data.domains}>
            <div :for={domain <- Enum.take(data.domains, 4)}>
              <div class="flex-none rounded-full bg-indigo-400/10 px-2 py-1 my-2 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-400/30">
                <%= domain %>
              </div>
            </div>
          </span>
          <svg
            class="size-5 flex-none text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            data-slot="icon"
          >
            <path
              fill-rule="evenodd"
              d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
              clip-rule="evenodd"
            />
          </svg>
        </li>
      </ul>

      <.simple_form :if={@results != []} for={@form} class="mt-10">
        <.input
          field={@form[:no_results]}
          type="pagination"
          label={gettext("Results per Origin")}
          options={[25, 50, 100]}
        >
          <div class="join col-span-6 ml-5">
            <button :if={@page > 1} class="join-item btn"><%= @page - 1 %></button>
            <button class="join-item btn btn-active"><%= @page %></button>
            <button :if={@results_max > @page * @page_size && @page > 1} class="join-item btn">
              <%= @page + 1 %>
            </button>
            <button :if={@page > 1} class="join-item btn" disabled>...</button>
            <button :if={@page > 1} class="join-item btn">
              <%= (@results_max /
                     @page_size)
              |> floor() %>
            </button>
          </div>
        </.input>
      </.simple_form>
    </div>
    """
  end

  def mount(
        _params,
        %{
          "tab_id" => tab_id,
          "group_index" => group_index,
          "user_token" => user_token,
          "parent" => parent_pid
        } = _session,
        socket
      ) do
    user = Datum.Accounts.get_user_by_session_token(user_token)
    # we don't trust anything that gets sent over the session, so back it all up with the db
    # this also helps us get the latest state object
    tab = Common.get_user_tab(user, tab_id)

    {:ok,
     socket
     |> assign(:results, [])
     |> assign(:results_max, 0)
     |> assign(:selected, nil)
     |> assign(:tab, tab)
     |> assign(:page, 1)
     |> assign(:page_size, 25)
     |> assign(:query, "")
     |> assign(:current_user, user)
     |> assign(:parent, parent_pid)
     |> assign(:group_index, group_index)
     |> assign(:form, to_form(%{"query" => nil, "no_results" => 25}))}
  end

  def update_state(socket) do
    {:ok, _} =
      Common.update_explorer_tabs(socket.assigns.tab, %{
        state: %{
          results:
            if socket.assigns.results != [] do
              socket.assigns.results
            end,
          # path items are condensed down down to just their data ids - they'll be hydrated by the mount function
          page:
            if socket.assigns.page do
              socket.assigns.page
            end,
          query:
            if socket.assigns.query do
              socket.assigns.query
            end,
          filters:
            if socket.assigns.filters != [] do
              socket.assigns.filters
            end,
          name:
            if socket.assigns.query do
              "Search for #{socket.assigns.query}"
            else
              "Search"
            end
        }
      })

    notify_parent({:tab_updated, socket.assigns.tab.id}, socket.assigns.parent)
    socket
  end

  def handle_event("close_tab", _unsigned_params, socket) do
    notify_parent({:close_tab, socket.assigns.tab.id}, socket.assigns.parent)
    {:noreply, socket}
  end

  def handle_event("select_result", %{"result" => result_id}, socket) do
    {:noreply,
     socket |> assign(:selected, Enum.find(socket.assigns.results, fn r -> r.id == result_id end))}
  end

  def handle_event("search", %{"query" => query} = _params, socket) do
    if String.length(query) >= 3 do
      results =
        Datum.Search.search_origins(Datum.Search, socket.assigns.current_user, query)

      results_max =
        if results != [] do
          Enum.max_by(results, & &1.count, fn -> nil end).count
        else
          0
        end

      {:noreply,
       socket
       |> assign(:query, query)
       |> assign(:results_max, results_max)
       |> assign(
         :results,
         results
       )}
    else
      {:noreply, socket |> assign(:query, query) |> assign(:results, [])}
    end
  end

  defp notify_parent(msg, process), do: send(process, msg)
end
