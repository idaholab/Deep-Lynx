defmodule Datum.PluginsTest do
  use Datum.DataCase

  alias Datum.Plugins

  describe "plugins" do
    alias Datum.Plugins.Plugin
    alias Datum.Plugins.Extractor

    import Datum.PluginsFixtures

    test "can run the default csv plugin" do
      valid_attrs = %{
        name: "csv extractor",
        path: "#{__DIR__}/wasm_plugins/extractors/csv_extractor.wasm",
        filetypes: [".csv", "text/csv"],
        plugin_type: :extractor
      }

      assert {:ok, %Plugin{} = plugin} = Plugins.create_plugin(valid_attrs)
      assert plugin.name == "csv extractor"
      assert plugin.filetypes == [".csv", "text/csv"]

      {:ok, json} = Extractor.extract(plugin, "#{__DIR__}/test_files/smallpop.csv")
      assert is_map(json)
    end
  end
end
