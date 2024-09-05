defmodule DatumWeb.ComponentsLive.DirectoryView do
  use DatumWeb, :live_component

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
              <td><.icon class="hover:bg-gray-900" name="hero-ellipsis-vertical" /></td>
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

  def update(_assigns, socket) do
    {:ok, socket}
  end
end
