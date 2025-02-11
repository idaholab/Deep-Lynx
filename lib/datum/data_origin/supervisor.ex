defmodule Datum.DataOrigin.Supervisor do
  @moduledoc """
  This is the supervisor in charge of starting and maintaining a list of running scanners
  for the various DataOrigins we've created.

  See: https://hexdocs.pm/elixir/supervisor-and-application.html
  """

  use Supervisor

  alias Datum.DataOrigin
  alias Datum.Accounts

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, :ok, opts)
  end

  @doc """
  On init we should be pulling in every origin, and if supported, starting a scanning process for them. Newly created origins will get added to this supervisor at
  time of creation, and will be caught again if the application restarts.
  """
  @impl true
  def init(:ok) do
    children =
      DataOrigin.list_data_origins()
      |> Enum.flat_map(&child_spec_from_origin(&1))

    Supervisor.init(children, strategy: :one_for_one)
  end

  # create a new function for each data origin type - or it will default to nothing, which will get
  # ignored by the supervisor
  def child_spec_from_origin(origin) when origin.type in [:filesystem, :duckdb] do
    # we start the scanner under the permissions of the owner 
    user = Accounts.get_user(origin.owned_by)

    [
      %{
        start:
          {Datum.Scanner, :start_link,
           [
             %{
               user: user,
               origin: origin,
               watch:
                 if origin.config do
                   Map.get(origin.config, "watch", false)
                 end,
               scan_on_start: true
             },
             [name: String.to_atom(ShortUUID.encode!(origin.id))]
           ]},
        id: ShortUUID.encode!(origin.id),
        restart: :transient
      }
    ]
  end

  def child_spec_from_origin(_origin) do
    []
  end
end
