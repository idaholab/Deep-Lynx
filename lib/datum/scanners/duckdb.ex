defmodule Datum.Scanners.DuckDB do
  @moduledoc """
  These are the functions for scanning a DuckDB origins or file and outputting a cohesive list of tables
  and columns. Like the Filesystem Scanner, you will need to handle a use case in which the Origin is one
  we have direct access to the database to manage - as well as the use case in which we are sending updates
  over the client socket (or just returning the data to the caller).
  """

  alias Datum.DataOrigin.Origin
  alias Datum.DataOrigin

  @doc """
  This version of scan assumes we're working with an Origin record on the server itself. Returns a list
  of tables with their columns and data types.
  """
  def scan(%Origin{} = origin, _opts \\ []) when is_map(origin.config) do
    with {:ok, db_pid} <-
           Datum.Duckdb.start_link(%{mode: :read_only, path: origin.config["path"]}),
         {:ok, describe_tables_result} <-
           Datum.Duckdb.query_sync(db_pid, "SELECT table_name FROM duckdb_tables();"),
         describe_tables_result <- Datum.Duckdb.result_to_df(describe_tables_result) do
      user = Datum.Accounts.get_user!(origin.owned_by)

      {:ok,
       Explorer.DataFrame.to_rows(describe_tables_result)
       |> Enum.map(fn %{"table_name" => table_name} ->
         {:ok, columns} =
           Datum.Duckdb.query_sync(
             db_pid,
             "SELECT column_name, data_type from duckdb_columns() WHERE table_name = '#{table_name}'"
           )

         DataOrigin.add_data(origin, user, %{
           path: table_name,
           type: :table,
           owned_by: user.id,
           properties: %{
             columns: columns |> Datum.Duckdb.result_to_df() |> Explorer.DataFrame.to_rows()
           }
         })
       end)}
    else
      err -> {:error, err}
    end
  end
end
