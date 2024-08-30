defmodule Datum.PluginsTest do
  use Datum.DataCase, async: false

  alias Datum.Plugins

  describe "plugins" do
    alias Datum.Plugins.Plugin

    import Datum.PluginsFixtures

    @invalid_attrs %{module: nil, name: nil, path: nil, filetypes: nil}

    test "list_plugins/0 returns all plugins" do
      plugin = plugin_fixture()
      assert Plugins.list_plugins() == [plugin]
    end

    test "list_plugins_by_extension/1 returns all plugins with matching extensions" do
      plugin = plugin_fixture()
      assert Plugins.list_plugins_by_extensions(plugin.filetypes) == [plugin]
    end

    test "get_plugin!/1 returns the plugin with given id" do
      plugin = plugin_fixture()
      assert Plugins.get_plugin!(plugin.id) == plugin
    end

    test "create_plugin/1 with valid data creates a plugin" do
      valid_attrs = %{
        module: "some module",
        name: "some name",
        path: "some path",
        filetypes: ["option1", "option2"]
      }

      assert {:ok, %Plugin{} = plugin} = Plugins.create_plugin(valid_attrs)
      assert plugin.module == "some module"
      assert plugin.name == "some name"
      assert plugin.path == "some path"
      assert plugin.filetypes == ["option1", "option2"]
    end

    test "create_plugin/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Plugins.create_plugin(@invalid_attrs)
    end

    test "update_plugin/2 with valid data updates the plugin" do
      plugin = plugin_fixture()

      update_attrs = %{
        module: "some updated module",
        name: "some updated name",
        path: "some updated path",
        filetypes: ["option1"]
      }

      assert {:ok, %Plugin{} = plugin} = Plugins.update_plugin(plugin, update_attrs)
      assert plugin.module == "some updated module"
      assert plugin.name == "some updated name"
      assert plugin.path == "some updated path"
      assert plugin.filetypes == ["option1"]
    end

    test "update_plugin/2 with invalid data returns error changeset" do
      plugin = plugin_fixture()
      assert {:error, %Ecto.Changeset{}} = Plugins.update_plugin(plugin, @invalid_attrs)
      assert plugin == Plugins.get_plugin!(plugin.id)
    end

    test "delete_plugin/1 deletes the plugin" do
      plugin = plugin_fixture()
      assert {:ok, %Plugin{}} = Plugins.delete_plugin(plugin)
      assert_raise Ecto.NoResultsError, fn -> Plugins.get_plugin!(plugin.id) end
    end

    test "change_plugin/1 returns a plugin changeset" do
      plugin = plugin_fixture()
      assert %Ecto.Changeset{} = Plugins.change_plugin(plugin)
    end
  end
end
