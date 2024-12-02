defmodule Datum.ModuleName do
  @moduledoc """
    This is how we store and restore Elixir module names in our
    application. Typically used for our explorer window panes or plugin names.
    This type is used by Ecto to safely store and restore Strings to Atoms.
  """
  use Ecto.Type
  def type, do: :string

  def cast(resource_type) when is_binary(resource_type) do
    {:ok, to_string(resource_type)}
  end

  def cast(resource_type) when is_atom(resource_type) do
    {:ok, Atom.to_string(resource_type)}
  end

  # dumping to DB we need to convert to BLOB
  def dump(value) when is_atom(value) do
    {:ok, Atom.to_string(value)}
  end

  def dump(value) when is_binary(value) do
    {:ok, to_string(value)}
  end

  def load(bin) when is_binary(bin) do
    # always use to_existing_atom when possible to avoid atom overflow attacks
    {:ok, String.to_existing_atom(bin)}
  end
end
