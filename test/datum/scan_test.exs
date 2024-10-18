defmodule Datum.ScanTest do
  @moduledoc """
  These tests are for the CLI's Scan functionality
  """
  # we can use the DataCase because we'll need the data databases for storing
  use Datum.DataCase, async: false

  alias Datum.DataOrigin
  alias Datum.DataOrigin.Origin
  alias Datum.Scanners.Filesystem

  describe "scanners" do
    import Datum.ScannerFixtures

    test "cli scan successfully runs" do
      test_path = setup()

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(%{name: "some name"})
      assert :ok = Datum.Scan.run([test_path])

      teardown()
    end
  end
end
