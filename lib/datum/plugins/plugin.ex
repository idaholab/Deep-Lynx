defmodule Datum.Plugins.Plugin do
  @moduledoc """
  Plugin represents a plugin supplied either by the system or by the user.
  These plugins are typically used for file system scanning and metadata extraction.
  Plugins can be WASM modules, either raw binary or on disk, or Elixir modules implementing
  the correct plugin type behavior.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder,
           only: [:id, :name, :path, :module_name, :enabled, :plugin_type, :filetypes]}
  schema "plugins" do
    # either store the raw plugin in BLOB or its path, not both - defaults to path first
    field :module, :binary
    field :name, :string
    field :path, :string

    # note that the module _must_ implement the callback behavior dictated in Datum.Extractor or others
    field :module_name, Datum.ModuleName
    field :enabled, :boolean, default: false
    field :plugin_type, Ecto.Enum, values: [:extractor, :sampler]
    field :filetypes, {:array, :string}

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(plugin, attrs) do
    changeset =
      plugin
      |> cast(attrs, [:name, :filetypes, :path, :module, :enabled, :module_name])
      |> validate_required([:name, :filetypes])

    if field_missing?(changeset, :path) && field_missing?(changeset, :module) &&
         field_missing?(changeset, :module_name) do
      changeset
      |> add_error(
        :path,
        "plugin must contain either the module or a path where the module can be found"
      )
      |> add_error(
        :module,
        "plugin must contain either the module or a path where the module can be found"
      )
      |> add_error(
        :module_name,
        "plugin must contain either the module or a path where the module can be found"
      )
    else
      changeset
    end
  end
end
