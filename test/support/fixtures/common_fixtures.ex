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
end
