defmodule Datum.DataOriginRepoTest do
  use Datum.DataOriginCase, async: false

  alias Datum.DataOrigin
  alias Datum.DataOrigin.OriginRepo

  describe "data_origins" do
    alias Datum.DataOrigin.Origin
    alias Datum.DataOrigin.Data

    @invalid_attrs %{name: nil}
    test "DataOriginRepo can create a database and run initial migrations" do
      valid_attrs = %{name: "some name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      assert origin.name == "some name"

      OriginRepo.with_dynamic_repo(
        origin.id,
        fn ->
          OriginRepo.insert!(Data.changeset(%Data{}, %{terminal_path: "/test/path.txt"}))
        end,
        mode: :readwrite,
        run_migrations: true
      )
    end
  end
end
