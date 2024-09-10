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
          <li><a>Home</a></li>
          <li><a>Documents</a></li>
          <li>Add Document</li>
        </ul>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Type</th>
              <th>Date Created</th>
            </tr>
          </thead>
          <tbody>
            <tr class="hover:bg-gray-500 hover:cursor-pointer">
              <th><.icon name="hero-folder" /></th>
              <td>Cy Ganderton</td>
              <td>Quality Control Specialist</td>
              <td>12/16/2020</td>
              <td>
                <.icon class="hover:bg-gray-900" name="hero-ellipsis-vertical" />
              </td>
            </tr>
            <tr class="hover:bg-gray-500 hover:cursor-pointer">
              <th><.icon name="hero-document-text" /></th>
              <td>Hart Hagerty</td>
              <td>Desktop Support Technician</td>
              <td>12/5/2020</td>
              <td><.icon class="hover:bg-gray-900" name="hero-ellipsis-vertical" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    """
  end

  def mount(_params, %{"tab_id" => tab_id, "user_token" => user_token} = _session, socket) do
    user = Datum.Accounts.get_user_by_session_token(user_token)
    tab = Common.get_user_tab(user, tab_id)

    if !user || !tab do
      {:error, socket}
    else
      {:ok, socket |> assign(:current_user, user) |> assign(:tab, tab)}
    end
  end
end
