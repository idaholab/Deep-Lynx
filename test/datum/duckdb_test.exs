defmodule Datum.DuckdbTest do
  @moduledoc """
  The tests related to the Duckdb GenServer
  """
  use Datum.DataCase, async: false

  describe "the duckdb GenServer" do
    alias Datum.Duckdb
    import Datum.AccountsFixtures

    test "can run a metadata query" do
      # we call the callbacks directly here, instead of standing up the genserver. pay attention to the state
      {:ok, state} =
        Duckdb.init(%{parent: self(), user: user_fixture()})

      Duckdb.handle_cast({:query, "select * from duckdb_settings();", []}, state)

      assert_receive {:query_response, %{result: result} = _msg}, 3000

      # let's make sure we can run a sync query too
      {:reply, {:ok, %Adbc.Result{} = _result}, state} =
        Duckdb.handle_call({:query, "select * from duckdb_settings();"}, self(), state)
    end

    test "can run an extensions query" do
      # we call the callbacks directly here, instead of standing up the genserver. pay attention to the state
      {:ok, state} =
        Duckdb.init(%{parent: self(), user: user_fixture()})

      Duckdb.handle_cast(
        {:query, "SELECT extension_name, installed, description FROM duckdb_extensions();", []},
        state
      )

      # we just want to make sure we're getting some results back here
      assert_receive {:query_response, %{result: ref} = _msg}, 3000
    end

    test "can add a csv file as table" do
      user = user_fixture()

      # we call the callbacks directly here, instead of standing up the genserver. Pay attention to the state
      {:ok, state} =
        Duckdb.init(%{parent: self(), user: user})

      assert {:reply, :ok, _state} =
               Duckdb.handle_call(
                 {:add_data, %Datum.DataOrigin.Origin.FilesystemConfig{},
                  ["#{__DIR__}/test_files/smallpop.csv"], [table_name: "table1"]},
                 self(),
                 state
               )

      Duckdb.handle_cast({:query, "SELECT * FROM table1;", []}, state)

      # we just want to make sure we're getting some results back here
      assert_receive {:query_response, %{result: ref} = _msg}, 3000
    end

    test "can add a parquet file as table" do
      user = user_fixture()

      # we call the callbacks directly here, instead of standing up the genserver. Pay attention to the state
      {:ok, state} =
        Duckdb.init(%{parent: self(), user: user})

      assert {:reply, :ok, _state} =
               Duckdb.handle_call(
                 {:add_data, %Datum.DataOrigin.Origin.FilesystemConfig{},
                  ["#{__DIR__}/test_files/iris.parquet"],
                  [extension: :parquet, table_name: "table2"]},
                 self(),
                 state
               )

      Duckdb.handle_cast({:query, "SELECT COUNT(*) FROM table2;", []}, state)

      # we just want to make sure we're getting some results back here
      assert_receive {:query_response, %{result: ref} = _msg}, 3000

      # let's check we can combine files - doesn't matter that they're the same
      assert {:reply, :ok, _state} =
               Duckdb.handle_call(
                 {:add_data, %Datum.DataOrigin.Origin.FilesystemConfig{},
                  ["#{__DIR__}/test_files/iris.parquet", "#{__DIR__}/test_files/iris.parquet"],
                  [extension: :parquet, table_name: "table2_multiple"]},
                 self(),
                 state
               )

      Duckdb.handle_cast({:query, "SELECT COUNT(*) FROM table2_multiple;", []}, state)

      # we just want to make sure we're getting some results back here
      assert_receive {:query_response, %{result: ref} = _msg}, 3000
    end

    test "can add a json file as table" do
      user = user_fixture()

      # we call the callbacks directly here, instead of standing up the genserver. Pay attention to the state
      {:ok, state} =
        Duckdb.init(%{parent: self(), user: user})

      assert {:reply, :ok, _state} =
               Duckdb.handle_call(
                 {:add_data, %Datum.DataOrigin.Origin.FilesystemConfig{},
                  ["#{__DIR__}/test_files/json_array.json"], [table_name: "table3"]},
                 self(),
                 state
               )

      Duckdb.handle_cast({:query, "SELECT COUNT(*) FROM table3;", []}, state)

      # we just want to make sure we're getting some results back here
      assert_receive {:query_response, %{result: ref} = _msg}, 3000
    end

    test "can open an actual db file vs memory only" do
      user = user_fixture()
      path = "#{__DIR__}/test_files/open_test.duckdb"

      # we call the callbacks directly here, instead of standing up the genserver. Pay attention to the state
      # make sure we can open a file 
      {:ok, _state} =
        Duckdb.init(%{parent: self(), user: user, path: path})

      assert File.exists?(path)
      File.rm(path)
    end
  end
end
