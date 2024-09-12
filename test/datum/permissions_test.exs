defmodule Datum.PermissionsTest do
  use Datum.DataCase, async: false

  alias Datum.Permissions

  describe "permissions_data_origin" do
    alias Datum.Permissions.DataOrigin
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
  end
end
