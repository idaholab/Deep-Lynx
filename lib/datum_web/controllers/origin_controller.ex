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
    with {:ok, %DataOrigin.Data{} = data} <-
           DataOrigin.add_data(
             DataOrigin.get_origin!(params["origin_id"]),
             conn.assigns.current_user,
             params
           ) do
      conn
      |> put_status(:created)
      |> json(data)
    end
  end
end
