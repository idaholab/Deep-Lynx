defmodule Datum.DataOriginTest do
  use Datum.DataCase, async: false

  alias Datum.DataOrigin

  describe "data_origins" do
    alias Datum.DataOrigin.Origin

    import Datum.DataOriginFixtures
    import Datum.AccountsFixtures

    @invalid_attrs %{name: nil}

    test "list_data_origins/0 returns all data_origins" do
      origin = origin_fixture()
      assert Enum.member?(DataOrigin.list_data_origins(), origin)
    end

    test "get_origin!/1 returns the origin with given id" do
      origin = origin_fixture()
      assert DataOrigin.get_origin!(origin.id) == origin
    end

    test "create_origin/1 with valid data creates a origin" do
      valid_attrs = %{name: "some name", type: :s3, config: %{"key" => "value"}}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      assert origin.name == "some name"
      assert origin.type == :s3
      assert origin.config == %{"key" => "value"}
    end

    test "create_origin/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = DataOrigin.create_origin(@invalid_attrs)
    end

    test "update_origin/2 with valid data updates the origin" do
      origin = origin_fixture()
      update_attrs = %{name: "some updated name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.update_origin(origin, update_attrs)
      assert origin.name == "some updated name"
    end

    test "update_origin/2 with invalid data returns error changeset" do
      origin = origin_fixture()
      assert {:error, %Ecto.Changeset{}} = DataOrigin.update_origin(origin, @invalid_attrs)
      assert origin == DataOrigin.get_origin!(origin.id)
    end

    test "delete_origin/1 deletes the origin" do
      origin = origin_fixture()
      assert {:ok, %Origin{}} = DataOrigin.delete_origin(origin)
      assert_raise Ecto.NoResultsError, fn -> DataOrigin.get_origin!(origin.id) end
    end

    test "change_origin/1 returns a origin changeset" do
      origin = origin_fixture()
      assert %Ecto.Changeset{} = DataOrigin.change_origin(origin)
    end
  end
end
