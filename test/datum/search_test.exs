defmodule Datum.SearchTest do
  use Datum.DataCase, async: false

  describe "the search GenServer" do
    alias Datum.DataOrigin.Origin
    alias Datum.DataOrigin
    alias Datum.Search
    import Datum.AccountsFixtures

    test "can run a search across multiple data origins" do
      user = user_fixture()

      assert {:ok, %Origin{} = origin1} =
               DataOrigin.create_origin(%{name: "Origin 1", owned_by: user.id})

      assert {:ok, %Origin{} = origin2} =
               DataOrigin.create_origin(%{name: "Origin 2", owned_by: user.id})

      assert {:ok, data1} =
               origin1
               |> DataOrigin.add_data(%{
                 path: "/some/nonexistent/path",
                 tags: ["data one"],
                 domain: ["mathematics"],
                 type: :file
               })

      assert {:ok, data2} =
               origin2
               |> DataOrigin.add_data(%{
                 path: "/a/new/path",
                 tags: ["data two"],
                 domain: ["science"],
                 type: :file
               })

      assert {:ok, pid} = GenServer.start_link(Search, nil)

      # run a basic search: because search is tricky, we're doing only basic things here
      # and can't always guarantee the number of results.
      assert Search.search_origins(pid, user, "data one") == [%{data1 | row_num: 1}]
      assert Search.search_origins(pid, user, "data two") == [%{data2 | row_num: 1}]
      assert Enum.count(Search.search_origins(pid, user, "data")) == 2
    end
  end
end
