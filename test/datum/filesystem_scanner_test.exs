defmodule Datum.ScannerTest do
  # we can use the DataCase because we'll need the data databases for storing
  # the information in
  use Datum.DataCase, async: false

  alias Datum.DataOrigin
  alias Datum.DataOrigin.Origin
  alias Datum.Scanners.Filesystem

  describe "scanners" do
    import Datum.ScannerFixtures
    import Datum.AccountsFixtures

    test "filesystem scanner can accurately scan/no plugins" do
      user = user_fixture()
      test_path = setup()
      valid_attrs = %{name: "some name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      Filesystem.scan_directory(origin, user, test_path, generate_checksum: true)
      teardown()
    end
  end
end
