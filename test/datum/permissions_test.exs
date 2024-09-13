defmodule Datum.PermissionsTest do
  use Datum.DataCase, async: false

  alias Datum.Permissions

  describe "permissions_data_origin" do
    alias Datum.DataOrigin

    import Datum.DataOriginFixtures
    import Datum.AccountsFixtures

    test "can list origins for user" do
      origin = origin_fixture()
      origin_not_owned = origin_fixture()
      user = user_fixture()
      tested_user = user_fixture()

      # we'll create the permission records manually this one time
      {:ok, _p} =
        Datum.Permissions.create_data_origin(%{
          data_origin_id: origin.id,
          user_id: tested_user.id,
          permission_type: :readwrite
        })

      {:ok, _p} =
        Datum.Permissions.create_data_origin(%{
          data_origin_id: origin_not_owned.id,
          user_id: user.id,
          permission_type: :readwrite
        })

      assert Datum.DataOrigin.list_data_orgins_user(tested_user) == [origin]
    end

    test "can fetch data for user" do
      origin = origin_fixture()
      user = user_fixture()
      tested_user = user_fixture()

      # we're also testing that on data creation the permissions are set
      {:ok, owned} =
        DataOrigin.add_data(origin, %{
          path: "test_file",
          type: :file,
          metadata: %{},
          owned_by: user.id
        })

      {:ok, not_owned} =
        DataOrigin.add_data(origin, %{
          path: "test_file",
          type: :file,
          metadata: %{},
          owned_by: tested_user.id
        })

      assert DataOrigin.get_data_user(origin, user, owned.id) == owned
      assert DataOrigin.get_data_user(origin, user, not_owned.id) == nil
    end

    test "can fetch data's descendants for user" do
      admin = user_fixture()
      not_admin = user_fixture()

      {:ok, origin} =
        DataOrigin.create_origin(%{
          name: "Test Origin",
          owned_by: admin.id
        })

      # build a simple nested directory
      dir_one =
        DataOrigin.add_data!(origin, %{
          path: "root",
          original_path: "/Users/darrjw/home",
          type: :root_directory,
          owned_by: admin.id
        })

      file_one =
        DataOrigin.add_data!(origin, %{
          path: "test.txt",
          original_path: "/Users/darrjw/home/test.txt",
          type: :file,
          owned_by: admin.id
        })

      {:ok, _} = DataOrigin.connect_data(origin, dir_one, dir_one)
      {:ok, _} = DataOrigin.connect_data(origin, dir_one, file_one)

      dir_two =
        DataOrigin.add_data!(origin, %{
          path: "second",
          original_path: "/Users/darrjw/home/second",
          type: :directory,
          owned_by: admin.id
        })

      {:ok, _} = DataOrigin.connect_data(origin, dir_one, dir_two)

      file_two =
        DataOrigin.add_data!(origin, %{
          path: "picture.png",
          original_path: "/Users/darrjw/home/second/picture.png",
          type: :file,
          owned_by: not_admin.id
        })

      {:ok, _} = DataOrigin.connect_data(origin, dir_two, file_two)

      assert Enum.count(Datum.DataOrigin.list_data_descendants_user(origin, admin, dir_one.id)) ==
               2
    end
  end
end
