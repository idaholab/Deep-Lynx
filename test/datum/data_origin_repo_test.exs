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
              properties: %{"json field one" => "json value one"}
            })
          )
        end,
        mode: :readwrite,
        run_migrations: true
      )
    end

    test "can add data to an origin" do
      user = user_fixture()
      valid_attrs = %{name: "some name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      assert origin.name == "some name"

      assert {:ok, _d} =
               origin
               |> DataOrigin.add_data(user, %{
                 path: "/some/nonexistent/path",
                 properties: %{plugin_generated_metadata: [%{test: "Test"}]},
                 type: :file
               })
    end

    test "can upsert data to an origin" do
      user = user_fixture()
      valid_attrs = %{name: "some name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      assert origin.name == "some name"

      assert {:ok, _d} =
               origin
               |> DataOrigin.add_data(
                 user,
                 %{
                   path: "/some/nonexistent/path",
                   properties: %{plugin_generated_metadata: [%{test: "Test"}]},
                   type: :file,
                   # we set a tag so that we can check to make sure upserting doesn't remove it
                   tags: ["test"]
                 }
               )

      assert {:ok, d} =
               origin
               |> DataOrigin.add_data(
                 user,
                 %{
                   path: "/some/nonexistent/path",
                   properties: %{plugin_generated_metadata: [%{test: "Test"}]},
                   type: :file,
                   # we set a tag so that we can check to make sure upserting doesn't remove it
                   tags: ["bad"]
                 }
               )

      data = DataOrigin.get_data!(origin, d.id)

      assert data.tags == ["test"]
      assert data.inserted_at == d.inserted_at
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
               |> DataOrigin.add_data(
                 user,
                 %{
                   path: "/some/nonexistent/path",
                   description: "keyword description",
                   type: :file
                 }
               )

      d = %{d | row_num: 1}

      assert DataOrigin.search_origin(origin, user, "keyword") |> Enum.map(fn r -> r.id end) == [
               d.id
             ]

      assert DataOrigin.search_origin(origin, user, "NONSENSE") == []

      # lets make sure tags and domains work
      assert {:ok, t} =
               origin
               |> DataOrigin.add_data(
                 user,
                 %{
                   path: "/some/nonexistent/path/two",
                   description: "keyword description",
                   tags: ["tag", "hello"],
                   domains: ["domain"],
                   type: :file
                 }
               )

      t = %{t | row_num: 1}

      assert DataOrigin.search_origin(origin, user, "domain") |> Enum.map(fn r -> r.id end) == [
               t.id
             ]

      assert DataOrigin.search_origin(origin, user, "tag") |> Enum.map(fn r -> r.id end) == [t.id]

      assert DataOrigin.search_origin(origin, user, "hello") |> Enum.map(fn r -> r.id end) == [
               t.id
             ]

      # lets make sure properties work
      assert {:ok, j} =
               origin
               |> DataOrigin.add_data(
                 user,
                 %{
                   path: "/some/nonexistent/path/three",
                   properties: %{"json field one" => "json value one"},
                   type: :file
                 }
               )

      j = %{j | row_num: 1}

      assert DataOrigin.search_origin(origin, user, "json") |> Enum.map(fn r -> r.id end) == [
               j.id
             ]

      assert DataOrigin.search_origin(origin, user, "field") |> Enum.map(fn r -> r.id end) == [
               j.id
             ]
    end

    test "can connect two pieces of data" do
      user = user_fixture()

      valid_attrs = %{name: "some name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      assert origin.name == "some name"

      assert {:ok, parent} =
               origin
               |> DataOrigin.add_data(user, %{
                 path: "/some/nonexistent/path",
                 type: :directory
               })

      assert {:ok, child} =
               origin
               |> DataOrigin.add_data(user, %{
                 path: "/some/nonexistent/path/child",
                 type: :file
               })

      assert {:ok, _} = DataOrigin.connect_data(origin, parent, child)
    end

    test "can create a relationship between two pieces of data" do
      user = user_fixture()
      valid_attrs = %{name: "some name"}

      assert {:ok, %Origin{} = origin} = DataOrigin.create_origin(valid_attrs)
      assert {:ok, %Origin{} = origin2} = DataOrigin.create_origin(valid_attrs)

      assert {:ok, data1} =
               origin
               |> DataOrigin.add_data(
                 user,
                 %{
                   path: "/some/nonexistent/path",
                   type: :directory
                 }
               )

      assert {:ok, data2} =
               origin
               |> DataOrigin.add_data(
                 user,
                 %{
                   path: "/some/nonexistent/path/child",
                   type: :file
                 }
               )

      assert {:ok, data3} =
               origin2
               |> DataOrigin.add_data(
                 user,
                 %{
                   path: "/some/nonexistent/path/child",
                   type: :file
                 }
               )

      # first we make sure we can make a relationship in the same origin
      {:ok, _r} = DataOrigin.add_relationship({data1, origin}, {data2, origin})

      assert DataOrigin.get_data!(origin, data1.id).outgoing_relationships == [
               [data2.id, origin.id]
             ]

      assert DataOrigin.get_data!(origin, data2.id).incoming_relationships == [
               [data1.id, origin.id]
             ]

      # now we check between origins
      {:ok, _r} = DataOrigin.add_relationship({data1, origin}, {data3, origin2})

      assert DataOrigin.get_data!(origin, data1.id).outgoing_relationships == [
               [data3.id, origin2.id]
             ]

      assert DataOrigin.get_data!(origin2, data3.id).incoming_relationships == [
               [data1.id, origin.id]
             ]
    end
  end
end
