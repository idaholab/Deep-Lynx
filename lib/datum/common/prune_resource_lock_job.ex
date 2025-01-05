defmodule Datum.Common.PruneResourceLockJob do
  @moduledoc """
  A simple worker for pruning any expired resource locks every hour 
  """
  use Oban.Worker, queue: :scheduled

  @impl Oban.Worker
  def perform(%Oban.Job{args: _args}) do
    Datum.Common.prune_expired_locks()

    :ok
  end
end
