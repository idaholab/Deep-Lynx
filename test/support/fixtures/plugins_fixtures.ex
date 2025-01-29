defmodule Datum.PluginsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Datum.Plugins` context.
  """

  @doc """
  Generate a plugin.
  """
  def plugin_fixture(attrs \\ %{}) do
    {:ok, plugin} =
      attrs
      |> Enum.into(%{
        filetypes: ["option1", "option2"],
        module_type: :elixir,
        module: "some module",
        name: "some name",
        path: "some path",
        enabled: true
      })
      |> Datum.Plugins.create_plugin()

    plugin
  end
end
