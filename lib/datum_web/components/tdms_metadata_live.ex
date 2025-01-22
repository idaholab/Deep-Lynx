defmodule DatumWeb.LiveComponent.TDMSMetadata do
  @moduledoc """
  This is used to display TDMS metadata, if present, within the File Viewer
  on the Data Origin Explorer.
  """
  use DatumWeb, :live_component
  use Gettext, backend: DatumWeb.Gettext

  @impl true
  def render(assigns) do
    ~H"""
    <div class="flex w-full">
      <!-- Sidebar for navigating TDMS metadata -->
      <div class="card-body w-1/4 bg-base-200 text-base-content p-4 overflow-y-auto">
        <ul class="menu">
          <li
            phx-click="select_item"
            phx-target={@myself}
            phx-value-item={@file_name}
            phx-value-type="file"
          >
            <a class={"#{if @selected_item == @file_name do "bg-primary" else "hover:bg-neutral" end}"}>
              {gettext("File Name:")} {@file_name}
            </a>
            <ul>
              <%= for group <- Map.get(@properties, "groups", []) do %>
                <li
                  phx-click="select_item"
                  phx-target={@myself}
                  phx-value-item={group["name"]}
                  phx-value-type="group"
                >
                  <a class={"#{if @selected_item == group["name"] do "bg-primary" else "hover:bg-neutral" end}"}>
                    {gettext("Group:")} {group["name"]}
                  </a>
                  <ul>
                    <%= for channel <- Map.get(group, "channels", []) do %>
                      <li
                        phx-click="select_item"
                        phx-target={@myself}
                        phx-value-item={channel["name"]}
                        phx-value-type="channel"
                      >
                        <a class={"#{if @selected_item == channel["name"] do "bg-primary" else "hover:bg-neutral" end}"}>
                          {gettext("Channel:")} {channel["name"]}
                        </a>
                      </li>
                    <% end %>
                  </ul>
                </li>
              <% end %>
            </ul>
          </li>
        </ul>
      </div>
      
    <!-- Divider -->
      <div class="divider divider-horizontal" />
      
    <!-- Main content -->
      <div class="card-body w-3/4">
        <h2 class="card-title">{@selected_type} `{@selected_item}` {gettext("Properties")}</h2>
        
    <!-- Properties Table -->
        <.table id="data-table" rows={@selected_properties} row_id={& &1["name"]}>
          <:col :let={row} label="Property Name">
            {row["name"]}
          </:col>
          <:col :let={row} label="Property Value">
            {row["value"]}
          </:col>
        </.table>
      </div>
    </div>
    """
  end

  @impl true
  def handle_event("select_item", %{"item" => item, "type" => type}, socket) do
    if type in Enum.map([:file, :group, :channel], &Atom.to_string/1) do
      type_atom = String.to_existing_atom(type)
      properties = find_properties(item, type_atom, socket.assigns.properties)

      {:noreply,
       assign(
         socket,
         selected_type: String.capitalize(type),
         selected_item: item,
         selected_properties: properties
       )}
    else
      {:noreply, socket}
    end
  end

  # various overrides of the find_properties method to handle property
  # fetching for the various data types within the tdms metadata
  defp find_properties(_, :file, properties) do
    properties["properties"]
  end

  defp find_properties(item, :group, properties) do
    Enum.find_value(properties["groups"], fn group ->
      if group["name"] == item do
        group["properties"]
      end
    end)
  end

  defp find_properties(item, :channel, properties) do
    Enum.find_value(properties["groups"], fn group ->
      Enum.find_value(group["channels"], fn channel ->
        if channel["name"] == item do
          channel["properties"]
        end
      end)
    end)
  end
end
