defmodule DatumWeb.ComponentsLive.Search do
  use DatumWeb, :live_component

  def render(assigns) do
    ~H"""
    <div
      class="relative z-10"
      role="dialog"
      aria-modal="true"
      phx-window-keydown="open_search"
      phx-target={@myself}
    >
      <div>
        <p class="flex items-center justify-center">
          <.icon name="hero-magnifying-glass-circle" class="h-10 w-10 " />Search
        </p>
      </div>
      <!--
        Background backdrop, show/hide based on modal state.

        Entering: "ease-out duration-300"
          From: "opacity-0"
          To: "opacity-100"
        Leaving: "ease-in duration-200"
          From: "opacity-100"
          To: "opacity-0"
      -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity" aria-hidden="true">
      </div>

      <div class="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
        <!--
          Command palette, show/hide based on modal state.

          Entering: "ease-out duration-300"
            From: "opacity-0 scale-95"
            To: "opacity-100 scale-100"
          Leaving: "ease-in duration-200"
            From: "opacity-100 scale-100"
            To: "opacity-0 scale-95"
        -->
        <div
          :if={@show_bar}
          phx-target={@myself}
          phx-click-away="close_search"
          class="mx-auto max-w-2xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all"
        >
          <div class="relative">
            <svg
              class="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clip-rule="evenodd"
              />
            </svg>
            <input
              type="text"
              class="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
              placeholder="Search..."
            />
          </div>
          <!-- Default state, show/hide based on command palette state. -->
          <ul class="max-h-80 scroll-py-2 divide-y divide-gray-100 overflow-y-auto">
            <li class="p-2">
              <h2 class="mb-2 mt-4 px-3 text-xs font-semibold text-gray-500">Recent searches</h2>
              <ul class="text-sm text-gray-700">
                <!-- Active: "bg-indigo-600 text-white" -->
                <li class="group flex cursor-default select-none items-center rounded-md px-3 py-2">
                  <!-- Active: "text-white", Not Active: "text-gray-400" -->
                  <svg
                    class="h-6 w-6 flex-none text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                    />
                  </svg>
                  <span class="ml-3 flex-auto truncate">Workflow Inc. / Website Redesign</span>
                  <!-- Not Active: "hidden" -->
                  <span class="ml-3 hidden flex-none text-indigo-100">Jump to...</span>
                </li>
              </ul>
            </li>
            <li class="p-2">
              <h2 class="sr-only">Quick actions</h2>
              <ul class="text-sm text-gray-700">
                <!-- Active: "bg-indigo-600 text-white" -->
                <li class="group flex cursor-default select-none items-center rounded-md px-3 py-2">
                  <!-- Active: "text-white", Not Active: "text-gray-400" -->
                  <svg
                    class="h-6 w-6 flex-none text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <span class="ml-3 flex-auto truncate">Add new file...</span>
                  <!-- Active: "text-indigo-100", Not Active: "text-gray-400" -->
                  <span class="ml-3 flex-none text-xs font-semibold text-gray-400">
                    <kbd class="font-sans">⌘</kbd><kbd class="font-sans">N</kbd>
                  </span>
                </li>
                <li class="group flex cursor-default select-none items-center rounded-md px-3 py-2">
                  <svg
                    class="h-6 w-6 flex-none text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                    />
                  </svg>
                  <span class="ml-3 flex-auto truncate">Add new folder...</span>
                  <span class="ml-3 flex-none text-xs font-semibold text-gray-400">
                    <kbd class="font-sans">⌘</kbd><kbd class="font-sans">F</kbd>
                  </span>
                </li>
                <li class="group flex cursor-default select-none items-center rounded-md px-3 py-2">
                  <svg
                    class="h-6 w-6 flex-none text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5"
                    />
                  </svg>
                  <span class="ml-3 flex-auto truncate">Add hashtag...</span>
                  <span class="ml-3 flex-none text-xs font-semibold text-gray-400">
                    <kbd class="font-sans">⌘</kbd><kbd class="font-sans">H</kbd>
                  </span>
                </li>
                <li class="group flex cursor-default select-none items-center rounded-md px-3 py-2">
                  <svg
                    class="h-6 w-6 flex-none text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                    />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                  <span class="ml-3 flex-auto truncate">Add label...</span>
                  <span class="ml-3 flex-none text-xs font-semibold text-gray-400">
                    <kbd class="font-sans">⌘</kbd><kbd class="font-sans">L</kbd>
                  </span>
                </li>
              </ul>
            </li>
          </ul>
          <!-- Results, show/hide based on command palette state. -->
          <ul class="max-h-96 overflow-y-auto p-2 text-sm text-gray-700">
            <!-- Active: "bg-indigo-600 text-white" -->
            <li class="group flex cursor-default select-none items-center rounded-md px-3 py-2">
              <!-- Active: "text-white", Not Active: "text-gray-400" -->
              <svg
                class="h-6 w-6 flex-none text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                />
              </svg>
              <span class="ml-3 flex-auto truncate">Workflow Inc. / Website Redesign</span>
              <!-- Not Active: "hidden" -->
              <span class="ml-3 hidden flex-none text-indigo-100">Jump to...</span>
            </li>
          </ul>
          <!-- Empty state, show/hide based on command palette state. -->
          <div class="px-6 py-14 text-center sm:px-14">
            <svg
              class="mx-auto h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
              />
            </svg>
            <p class="mt-4 text-sm text-gray-900">
              We couldn't find any projects with that term. Please try again.
            </p>
          </div>
        </div>
      </div>
    </div>
    """
  end

  def update(_assigns, socket) do
    {:ok, socket |> assign(:show_bar, false)}
  end

  def handle_event("close_search", _params, socket) do
    {:noreply, socket |> assign(:show_bar, false)}
  end

  def handle_event("open_search", params, socket) do
    case params do
      %{"ctrlKey" => true, "key" => " "} ->
        {:noreply, socket |> assign(:show_bar, socket.assigns.show_bar == false)}

      %{"ctrlKey" => _x, "key" => "Escape"} ->
        {:noreply, socket |> assign(:show_bar, false)}

      _ ->
        {:noreply, socket}
    end
  end
end
