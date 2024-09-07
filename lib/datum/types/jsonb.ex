defmodule Datum.JSONB do
  @moduledoc """
  This is the custom type that lets us handle JSONB in Sqlite, using the now
  native JSONB type (keep in mind this is just extended BLOB, but storing it as
  JSONB lets us use json sqlite functions)

  This is pulled nearly directly from the Postgres ecto driver
  """
  use Ecto.Type
  def type, do: :binary

  defmacro int32 do
    quote do: signed - 32
  end

  def cast(resource_type) when is_map(resource_type) do
    {:ok, resource_type}
  end

  def cast(resource_type) when is_bitstring(resource_type) do
    {:ok, resource_type}
  end

  defmacro binary(size) do
    quote do: binary - size(unquote(size))
  end

  defmacro binary(size, unit) do
    quote do: binary - size(unquote(size)) - unit(unquote(unit))
  end

  # dumping to DB we need to convert to BLOB
  def dump(value) when is_map(value) do
    data = Jason.encode_to_iodata!(value)

    {:ok, [<<IO.iodata_length(data) + 1::int32(), 1>> | data]}
  end

  def dump(value) when is_bitstring(value) do
    {:ok, [<<IO.iodata_length(value) + 1::int32(), 1>> | value]}
  end

  def load(bin) when is_binary(bin) do
    <<len::int32(), data::binary-size(len)>> = bin
    <<1, json::binary>> = data

    {:ok,
     json
     |> :binary.copy()
     |> Jason.decode!()}
  end
end
