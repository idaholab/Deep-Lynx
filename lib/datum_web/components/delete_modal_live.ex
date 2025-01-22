defmodule DatumWeb.LiveComponent.DeleteOrigin do
  @moduledoc """
  This is used to delete a data origin
  """

  # In Phoenix apps, the line is typically: use MyAppWeb, :live_component
  use DatumWeb, :live_component
  use Gettext, backend: DatumWeb.Gettext

  alias Datum.DataOrigin

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <div class="text-center text-black">
    {gettext("Deleting a data origin will not affect your data. However, it will remove the stored connection configurations and metadata.

    ")}      </div>
      <div class="pt-4">
        <.button
          type="submit"
          class="absolute bottom-6 right-5"
          phx-click="delete_origin_modal"
          phx-value-origin_id={@origin_id}
        > Delete Origin
        </.button>
      </div>
    </div>
    """
  end
end
