defmodule DatumWeb.PluginsController do
  @moduledoc """
  The json endpoints for handling pluging information and binary module
  retrieval. Typically used by the CLI tool to sync for local use.
  """
  use DatumWeb, :controller

  def list_info(conn, _params) do
    conn
    |> put_status(200)
    |> json(Datum.Plugins.list_plugin_info())
  end
end
