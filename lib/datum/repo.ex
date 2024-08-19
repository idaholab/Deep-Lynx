defmodule Datum.Repo do
  use Ecto.Repo,
    otp_app: :datum,
    adapter: Ecto.Adapters.Postgres
end
