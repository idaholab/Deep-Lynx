defmodule Datum.PluginsRunTest do
  use Datum.DataCase, async: false

  alias Datum.Plugins

  describe "plugins" do
    alias Datum.Plugins.Plugin
    alias Datum.Plugins.Extractor
    alias Datum.Plugins.Sampler

    test "can run the default csv wasm plugin" do
      valid_attrs = %{
        name: "csv extractor",
        module_type: :wasm,
        path: "#{__DIR__}/wasm_plugins/extractors/csv_extractor.wasm",
        filetypes: [".csv", "text/csv"],
        plugin_type: :extractor
      }

      assert {:ok, %Plugin{} = plugin} = Plugins.create_plugin(valid_attrs)
      assert plugin.name == "csv extractor"
      assert plugin.filetypes == [".csv", "text/csv"]

      {:ok, json} = Extractor.plugin_extract(plugin, "#{__DIR__}/test_files/smallpop.csv")
      assert is_map(json)
    end

    test "can run the default csv elixir plugin" do
      valid_attrs = %{
        name: "csv extractor_elixir",
        module_type: :elixir,
        module_name: Datum.Plugins.CSV,
        filetypes: [".csv", "text/csv"],
        plugin_type: :extractor
      }

      assert {:ok, %Plugin{} = plugin} = Plugins.create_plugin(valid_attrs)
      assert plugin.name == "csv extractor_elixir"
      assert plugin.filetypes == [".csv", "text/csv"]

      {:ok, json} =
        Extractor.plugin_extract(plugin, "#{__DIR__}/test_files/smallpop.csv")

      assert is_map(json)
    end

    test "can run the default tdms index elixir plugin" do
      valid_attrs = %{
        name: "tdms index extractor_elixir",
        module_type: :elixir,
        module_name: Datum.Plugins.TdmsIndex,
        filetypes: [".tdms_index"],
        plugin_type: :extractor
      }

      assert {:ok, %Plugin{} = plugin} = Plugins.create_plugin(valid_attrs)
      assert plugin.name == "tdms index extractor_elixir"
      assert plugin.filetypes == [".tdms_index"]

      {:ok, json} =
        Extractor.plugin_extract(plugin, "#{__DIR__}/test_files/doe.tdms_index")

      assert is_map(json)
    end

    @tag :python
    test "can run the test python sampler plugin" do
      valid_attrs = %{
        name: "python sampler",
        module_type: :python,
        module_name: :csv_sample,
        filetypes: [".csv", "text/csv"],
        plugin_type: :sampler,
        path: "#{__DIR__}/python_plugins/csv_sample.py"
      }

      assert {:ok, %Plugin{} = plugin} = Plugins.create_plugin(valid_attrs)
      assert plugin.name == "python sampler"
      assert plugin.filetypes == [".csv", "text/csv"]

      {:ok, json} =
        Sampler.plugin_sample(plugin, "#{__DIR__}/test_files/smallpop.csv")

      assert is_map(json)
    end
  end
end
