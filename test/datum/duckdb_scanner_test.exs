defmodule Datum.DuckDBScannerTest do
  use Datum.DataCase, async: false

  alias Datum.DataOrigin
  alias Datum.DataOrigin.Origin
  import Datum.DataOriginFixtures
  import Datum.AccountsFixtures

  describe "a duckdb system scanner" do
    test "can build a metadata scan of a duckdb origin" do
      path = "#{__DIR__}/test_files/test_db.duckdb"
      user = user_fixture()

      valid_attrs = %{
        name: "some name",
        type: :duckdb,
        config: %{"path" => path},
        owned_by: user.id
      }

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      assert origin.name == "some name"
      assert origin.type == :duckdb

      assert {:ok, table_info} = Datum.Scanners.DuckDB.scan(origin)
    end
  end
end
