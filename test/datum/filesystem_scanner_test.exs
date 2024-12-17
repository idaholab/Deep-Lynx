defmodule Datum.ScannerTest do
  # we can use the DataCase because we'll need the data databases for storing
  # the information in
  use Datum.DataCase, async: false

  alias Datum.DataOrigin
  alias Datum.DataOrigin.Origin
  alias Datum.Scanners.Filesystem

  describe "scanners" do
    import Datum.ScannerFixtures

    test "filesystem scanner can accurately scan/no plugins" do
      test_path = setup()
      valid_attrs = %{name: "some name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      Filesystem.scan_directory(origin, test_path, generate_checksum: true)
      teardown()
    end
  end
end
