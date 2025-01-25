defmodule DatumWeb.OriginController do
  @moduledoc """
  The json endpoints for working with Data Origins
  """
  use DatumWeb, :controller
  alias Datum.DataOrigin

  def list(conn, _params) do
    conn
    |> put_status(200)
    |> json(Datum.DataOrigin.list_data_orgins_user(conn.assigns.current_user))
  end

  def fetch(conn, %{"origin_id" => origin_id} = _params) do
    origin = DataOrigin.get_data_orgins_user(conn.assigns.current_user, origin_id)

    if origin do
      conn
      |> put_status(200)
      |> json(origin)
    else
      conn
      |> put_status(404)
    end
  end

  def fetch_data(conn, %{"origin_id" => origin_id, "data_id" => data_id} = _params) do
    origin = DataOrigin.get_data_orgins_user(conn.assigns.current_user, origin_id)

    if origin do
      conn
      |> put_status(200)
      |> json(DataOrigin.get_data_user(origin, conn.assigns.current_user, data_id))
    else
      conn
      |> put_status(404)
    end
  end

  def root_directory(conn, %{"origin_id" => origin_id} = _params) do
    origin = DataOrigin.get_data_orgins_user(conn.assigns.current_user, origin_id)

    if origin do
      conn
      |> put_status(200)
      |> json(
        origin
        |> DataOrigin.list_roots()
        |> Enum.map(
          &DataOrigin.list_data_descendants_user(origin, conn.assigns.current_user, &1.id)
        )
        |> List.flatten()
      )
    else
      conn
      |> put_status(404)
    end
  end

  def create(conn, params) do
    with {:ok, %DataOrigin.Origin{} = origin} <-
           DataOrigin.create_origin(
             params
             |> Map.put("owned_by", conn.assigns.current_user.id)
           ) do
      conn
      |> put_status(:created)
      |> json(origin)
    end
  end

  def create_data(conn, params) do
    user = conn.assigns.current_user
    origin = DataOrigin.get_origin!(params["origin_id"])

    with {:ok, data} <- DataOrigin.add_data(origin, user, params),
         {:ok, dir} <-
           DataOrigin.add_data(origin, user, %{
             path: Path.dirname(data.path),
             type: :directory
           }),
         {:ok, _p} <- DataOrigin.connect_data(origin, dir, data) do
      conn
      |> put_status(:created)
      |> json(data)
    end
  end

  def explore(conn, %{"origin_id" => origin_id, "query" => query} = _params) do
    origin = DataOrigin.get_data_orgins_user(conn.assigns.current_user, origin_id)

    if origin do
      case DataOrigin.query_origin_sync(origin, query) do
        {:ok, df} ->
          out =
            "[#{Explorer.DataFrame.dump_ndjson!(df) |> String.trim() |> String.split("\n") |> Enum.map(&to_charlist/1) |> Enum.join(",")}]"

          conn
          # we have to set the header manually since we're sending raw json
          |> put_resp_content_type("application/json")
          |> send_resp(
            200,
            out
          )

        {:error, message} ->
          conn |> put_status(500) |> text(message)
      end
    else
      conn
      |> put_status(404)
    end
  end
end
