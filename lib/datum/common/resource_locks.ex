defmodule Datum.Common.ResourceLocks do
  @moduledoc """
  ResourceLocks represent mutices on resources in the Datum ecosystem. Currently only used for DataOrigins
  so that users or system processes can lock them for updating and prevent writes while they are re-scanning
  the resource. 
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "resource_locks" do
    # as we have other resources that might need locked in the future, keep this open
    field :resource_id, :binary_id
    field :resource_type, Ecto.Enum, values: [:data_origin]
    field :expires_at, :utc_datetime
    belongs_to :user, Datum.Accounts.User, type: :binary_id, foreign_key: :locked_by

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(resource_locks, attrs) do
    resource_locks
    |> cast(attrs, [:expires_at, :resource_type, :locked_by, :resource_id])
    |> validate_required([:resource_type, :locked_by, :resource_id])
  end
end
