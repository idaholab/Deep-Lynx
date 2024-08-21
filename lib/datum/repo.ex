defmodule Datum.Repo do
  @moduledoc """
  This is meant to be the "operations" repo. This should hold user information, information on
  metadata models, maybe some pointers to data platforms - BUT NOT THE DATA ITSELF.
  """
  use Ecto.Repo,
    otp_app: :datum,
    adapter: Ecto.Adapters.SQLite3
end
