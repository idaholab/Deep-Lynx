defmodule Datum.ScannerTest do
  # we can use the DataCase because we'll need the data databases for storing
  # the information in
  use Datum.DataCase, async: false

  alias Datum.DataOrigin

  describe "scanners" do
    import Datum.ScannerFixtures
  end
end
