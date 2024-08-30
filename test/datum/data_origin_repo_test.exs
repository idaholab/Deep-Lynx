defmodule Datum.DataOriginRepoTest do
  use Datum.DataOriginCase, async: false

  alias Datum.DataOrigin
  alias Datum.DataOrigin.OriginRepo

  describe "data_origins" do
    alias Datum.DataOrigin.Origin
    alias Datum.DataOrigin.Data

    test "DataOriginRepo can create a database and run initial migrations" do
      valid_attrs = %{name: "some name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      assert origin.name == "some name"

      OriginRepo.with_dynamic_repo(
        origin,
        fn ->
          OriginRepo.insert!(
            Data.changeset(%Data{}, %{
              type: :file,
              path: "/test/path.txt",
              metadata: %{plugin_generated_metadata: [%{test: "Test"}]}
            })
          )
        end,
        mode: :readwrite,
        run_migrations: true
      )
    end

    test "DataOriginRepo can add data to an origin" do
      valid_attrs = %{name: "some name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      assert origin.name == "some name"

      assert {:ok, _d} =
               origin
               |> DataOrigin.add_data(%{
                 path: "/some/nonexistent/path",
                 type: :file
               })
    end

    test "DataOriginRepo can connect two pieces of data" do
      valid_attrs = %{name: "some name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      assert origin.name == "some name"

      assert {:ok, parent} =
               origin
               |> DataOrigin.add_data(%{
                 path: "/some/nonexistent/path",
                 type: :directory
               })

      assert {:ok, child} =
               origin
               |> DataOrigin.add_data(%{
                 path: "/some/nonexistent/path/child",
                 type: :file
               })

      assert {:ok, _} = DataOrigin.connect_data(origin, parent, child)
    end
  end
end
