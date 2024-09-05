defmodule Datum.CommonTest do
  use Datum.DataCase

  alias Datum.Common

  describe "explorer_tabs" do
    alias Datum.Common.ExplorerTabs

    import Datum.CommonFixtures

    @invalid_attrs %{module: nil}

    test "list_explorer_tabs/0 returns all explorer_tabs" do
      explorer_tabs = explorer_tabs_fixture()
      assert Common.list_explorer_tabs() == [explorer_tabs]
    end

    test "get_explorer_tabs!/1 returns the explorer_tabs with given id" do
      explorer_tabs = explorer_tabs_fixture()
      assert Common.get_explorer_tabs!(explorer_tabs.id) == explorer_tabs
    end

    test "create_explorer_tabs/1 with valid data creates a explorer_tabs" do
      valid_attrs = %{module: "some module", state: %{}}

      assert {:ok, %ExplorerTabs{} = explorer_tabs} = Common.create_explorer_tabs(valid_attrs)
      assert explorer_tabs.module == "some module"
    end

    test "create_explorer_tabs/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Common.create_explorer_tabs(@invalid_attrs)
    end

    test "update_explorer_tabs/2 with valid data updates the explorer_tabs" do
      explorer_tabs = explorer_tabs_fixture()
      update_attrs = %{module: "some updated module"}

      assert {:ok, %ExplorerTabs{} = explorer_tabs} =
               Common.update_explorer_tabs(explorer_tabs, update_attrs)

      assert explorer_tabs.module == "some updated module"
    end

    test "update_explorer_tabs/2 with invalid data returns error changeset" do
      explorer_tabs = explorer_tabs_fixture()

      assert {:error, %Ecto.Changeset{}} =
               Common.update_explorer_tabs(explorer_tabs, @invalid_attrs)

      assert explorer_tabs == Common.get_explorer_tabs!(explorer_tabs.id)
    end

    test "delete_explorer_tabs/1 deletes the explorer_tabs" do
      explorer_tabs = explorer_tabs_fixture()
      assert {:ok, %ExplorerTabs{}} = Common.delete_explorer_tabs(explorer_tabs)
      assert_raise Ecto.NoResultsError, fn -> Common.get_explorer_tabs!(explorer_tabs.id) end
    end

    test "change_explorer_tabs/1 returns a explorer_tabs changeset" do
      explorer_tabs = explorer_tabs_fixture()
      assert %Ecto.Changeset{} = Common.change_explorer_tabs(explorer_tabs)
    end
  end
end
