defmodule DatumWeb.OriginController do
  @moduledoc """
  The json endpoints for working with Data Origins
  """
  use DatumWeb, :controller

  def list(conn, _params) do
    conn
    |> put_status(200)
    |> json(Datum.DataOrigin.list_data_orgins_user(conn.assigns.current_user))
  end

  def create(conn, params) do
    with {:ok, %Datum.DataOrigin.Origin{} = origin} <-
           Datum.DataOrigin.create_origin(
             params
             |> Map.put("owned_by", conn.assigns.current_user.id)
           ) do
      conn
      |> put_status(:created)
      |> json(origin)
    end
  end
end
