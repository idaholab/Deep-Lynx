defmodule Datum.ModuleName do
  @moduledoc """
  This is the custom type that lets us handle JSONB in Sqlite
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
    {:ok, String.to_existing_atom(bin)}
  end
end
