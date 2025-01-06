defmodule Datum.CommonTest do
  use Datum.DataCase, async: false

  alias Datum.Common

  describe "explorer_tabs" do
    alias Datum.Common.ExplorerTabs

    import Datum.CommonFixtures

    @invalid_attrs %{module: nil}

    test "list_explorer_tabs/0 returns all explorer_tabs" do
      explorer_tabs = explorer_tabs_fixture()
      explorer_tabs = Common.get_explorer_tabs!(explorer_tabs.id)

      assert Enum.member?(Common.list_explorer_tabs(), explorer_tabs)
    end

    test "get_explorer_tabs!/1 returns the explorer_tabs with given id" do
      explorer_tabs = explorer_tabs_fixture()
      assert Common.get_explorer_tabs!(explorer_tabs.id).id == explorer_tabs.id
    end

    test "create_explorer_tabs/1 with valid data creates a explorer_tabs" do
      valid_attrs = %{module: DatumWeb.OriginExplorerLive, state: %{}}

      assert {:ok, %ExplorerTabs{} = explorer_tabs} = Common.create_explorer_tabs(valid_attrs)
      assert explorer_tabs.module == "Elixir.DatumWeb.OriginExplorerLive"
    end

    test "create_explorer_tabs/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Common.create_explorer_tabs(@invalid_attrs)
    end

    test "update_explorer_tabs/2 with valid data updates the explorer_tabs" do
      explorer_tabs = explorer_tabs_fixture()
      update_attrs = %{module: DatumWeb.Endpoint}

      assert {:ok, %ExplorerTabs{} = explorer_tabs} =
               Common.update_explorer_tabs(explorer_tabs, update_attrs)

      assert explorer_tabs.module == "Elixir.DatumWeb.Endpoint"
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

  describe "resource_locks" do
    alias Datum.Common.ResourceLocks

    import Datum.CommonFixtures
    import Datum.AccountsFixtures
    import Datum.DataOriginFixtures

    @invalid_attrs %{expires_at: nil}

    test "can lock a resource" do
      user = user_fixture()
      origin = origin_fixture(%{inserted_by: user.id})

      assert {:ok, _lock} = Common.lock_resource(:data_origin, origin.id, user)
    end

    test "can't lock a locked resource" do
      user = user_fixture()
      origin = origin_fixture(%{inserted_by: user.id})

      assert {:ok, _lock} = Common.lock_resource(:data_origin, origin.id, user)
      # doesn't matter who it is, we shouldn't be able to lock this resource again
      assert {:error, :resource_locked} = Common.lock_resource(:data_origin, origin.id, user)
    end

    test "can lock an expired resource" do
      user = user_fixture()
      origin = origin_fixture(%{inserted_by: user.id})

      resource_locks =
        resource_locks_fixture(%{
          locked_by: user.id,
          expires_at: DateTime.add(DateTime.utc_now(), -30, :minute)
        })

      assert {:ok, _lock} = Common.lock_resource(:data_origin, origin.id, user)
      # let's make sure the lock is now active
      assert {:error, :resource_locked} = Common.lock_resource(:data_origin, origin.id, user)
    end

    test "list_resource_locks/0 returns all resource_locks" do
      resource_locks = resource_locks_fixture()
      assert Common.list_resource_locks() == [resource_locks]
    end

    test "get_resource_locks!/1 returns the resource_locks with given id" do
      resource_locks = resource_locks_fixture()
      assert Common.get_resource_locks!(resource_locks.id) == resource_locks
    end

    test "update_resource_locks/2 with valid data updates the resource_locks" do
      resource_locks = resource_locks_fixture()
      update_attrs = %{expires_at: ~U[2025-01-05 15:04:00Z]}

      assert {:ok, %ResourceLocks{} = resource_locks} =
               Common.update_resource_locks(resource_locks, update_attrs)

      assert resource_locks.expires_at == ~U[2025-01-05 15:04:00Z]
    end

    test "delete_resource_locks/1 deletes the resource_locks" do
      resource_locks = resource_locks_fixture()
      assert {:ok, %ResourceLocks{}} = Common.delete_resource_locks(resource_locks)
      assert_raise Ecto.NoResultsError, fn -> Common.get_resource_locks!(resource_locks.id) end
    end

    test "change_resource_locks/1 returns a resource_locks changeset" do
      resource_locks = resource_locks_fixture()
      assert %Ecto.Changeset{} = Common.change_resource_locks(resource_locks)
    end
  end
end
