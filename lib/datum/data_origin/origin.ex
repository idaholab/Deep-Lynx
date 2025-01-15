defmodule Datum.DataOrigin.Origin do
  @moduledoc """
  Represents a point of origin for data. Typically we view these as file systems, network drives,
  HPC clusters etc. It's a logical, hierarchical separation of data that is representive of a filesystem.
  Origins should contain a lot of data - but if they start to grow too large we'll need to look at separating them
  or figuring how to handle splitting the underlying Sqlite3 database. That's right - each Origin has it's OWN Sqlite3
  databased stored at the configured filesystem point.

  Separate databases allow us to search them concurrently, handle need to know and permissions across a better security surface (can't
  break out of a table if you're not even in the database) and to handle differing encryption and classification needs for the origins.
  The endgoal here is that these origin's might be running on different servers, or even typically available in other networks, but attached
  to an operational database.

  Note: while currently not the case, it is hypothesized that an Origin _could_ eventually belong to more than one instance of the main
  Datum server.
  """
  use Ecto.Schema
  import Ecto.Changeset

  alias Datum.Accounts.User

  @derive {Jason.Encoder,
           only: [
             :id,
             :name,
             :owned_by,
             :classifications,
             :tags,
             :domains,
             :type,
             :inserted_at,
             :updated_at
           ]}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "data_origins" do
    field :name, :string
    belongs_to :owner, User, type: :binary_id, foreign_key: :owned_by

    # the absolute path as to where the database is located
    # defaults to "~./.datum_databases/origins/{short_form_of_id}"
    field :database_path, :string
    field :classifications, {:array, :string}
    field :tags, {:array, :string}
    field :domains, {:array, :string}

    field :type, Ecto.Enum, values: [:s3, :filesystem, :default], default: :filesystem
    # stores the raw configuration values for the type of origin this is
    # if nil, we assume we don't have direct connection to the origin and
    # therefore it's metadata only
    field :config, :map, default: nil

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(origin, attrs) do
    origin
    |> cast(attrs, [
      :id,
      :name,
      :owned_by,
      :classifications,
      :tags,
      :domains,
      :type,
      :config,
      :database_path
    ])
    |> validate_required([:name])
  end
end

defmodule Datum.DataOrigin.Origin.S3Config do
  @moduledoc """
  S3 Configuration for Data Origins
  """
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :endpoint, :string, default: "s3.amazonaws.com"
    field :access_key_id, :string
    field :secret_access_key, :string
    field :bucket, :string
    field :region, :string, default: "us-east-1"
  end

  @doc false
  def changeset(config, attrs) do
    config
    |> cast(attrs, [:endpoint, :access_key_id, :secret_access_key, :bucket, :region])
    |> validate_required([:access_key_id, :secret_access_key, :bucket])
  end
end

defmodule Datum.DataOrigin.Origin.R2Config do
  @moduledoc """
  R2 Configuration for Data Origins
  """
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :key_id, :string
    field :secret, :string
    field :account_id, :string
  end

  @doc false
  def changeset(config, attrs) do
    config
    |> cast(attrs, [:key_id, :secret, :account_id])
    |> validate_required([:key_id, :secret, :account_id])
  end
end

defmodule Datum.DataOrigin.Origin.AzureConfig do
  @moduledoc """
  Azure Blob Configuration for Data Origins
  """
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :connection_string, :string
    field :container, :string
  end

  @doc false
  def changeset(config, attrs) do
    config
    |> cast(attrs, [:connection_string, :container])
    |> validate_required([:connection_string, :container])
  end
end

defmodule Datum.DataOrigin.Origin.FilesystemConfig do
  @moduledoc """
  Filesystem configuration - not necessarily needed if the filesystem is local, but
  if it's a networked location - we need the information to make connections.
  Note: that we can't actually easily make that connection from within Erlang itself.
  """
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :root_path, :string
    field :network_user, :string, default: nil
    field :network_user_password, :string, default: nil
  end

  @doc false
  def changeset(config, attrs) do
    config
    |> cast(attrs, [:root_path, :network_user, :network_user_password])
    |> validate_required([:root_path])
  end
end
