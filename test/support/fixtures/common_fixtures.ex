defmodule Datum.CommonFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Datum.Common` context.
  """

  @doc """
  Generate a explorer_tabs.
  """
  def explorer_tabs_fixture(attrs \\ %{}) do
    {:ok, explorer_tabs} =
      attrs
      |> Enum.into(%{
        module: DatumWeb.OriginExplorerLive,
        state: %{}
      })
      |> Datum.Common.create_explorer_tabs()

    explorer_tabs
  end

  @doc """
  Generate a resource_locks.
  """
  def resource_locks_fixture(attrs \\ %{}) do
    import Datum.AccountsFixtures
    user = user_fixture()

    {:ok, resource_locks} =
      attrs
      |> Enum.into(%{
        expires_at: ~U[2025-01-04 15:04:00Z],
        resource_type: :data_origin,
        locked_by: user.id,
        # just need a fake resource for this part
        resource_id: UUID.uuid4()
      })
      |> Datum.Common.create_resource_locks()

    resource_locks
  end
end
