defmodule Datum.DataOriginRepoTest do
  use Datum.DataCase, async: false

  alias Datum.DataOrigin
  import Datum.AccountsFixtures
  alias Datum.DataOrigin.OriginRepo

  describe "data_origin repo" do
    alias Datum.DataOrigin.Origin
    alias Datum.DataOrigin.Data

    test "can create a database and run initial migrations" do
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

    test "can add data to an origin" do
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

    test "can search data in an origin" do
      # keep in mind that actually testing how effective search is, is really difficult and
      # typically more heurstics than anything. Thus we only test that the search works
      # and some very basic keyword returns and checking
      user = user_fixture()
      valid_attrs = %{name: "some name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      assert origin.name == "some name"

      assert {:ok, d} =
               origin
               |> DataOrigin.add_data(%{
                 path: "/some/nonexistent/path",
                 description: "keyword description",
                 type: :file
               })

      d = %{d | row_num: 1}

      assert DataOrigin.search_origin(origin, user, "keyword") == [d]
      assert DataOrigin.search_origin(origin, user, "NONSENSE") == []

      # lets make sure tags and domains work
      assert {:ok, t} =
               origin
               |> DataOrigin.add_data(%{
                 path: "/some/nonexistent/path/two",
                 description: "keyword description",
                 tags: ["tag", "hello"],
                 domains: ["domain"],
                 type: :file
               })

      t = %{t | row_num: 1}
      assert DataOrigin.search_origin(origin, user, "domain") == [t]
      assert DataOrigin.search_origin(origin, user, "tag") == [t]
      assert DataOrigin.search_origin(origin, user, "hello") == [t]
    end

    test "can connect two pieces of data" do
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
