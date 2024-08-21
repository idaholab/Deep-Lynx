defmodule Datum.DataOriginFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Datum.DataOrigin` context.
  """

  @doc """
  Generate a origin.
  """
  def origin_fixture(attrs \\ %{}) do
    {:ok, origin} =
      attrs
      |> Enum.into(%{
        name: "some name"
      })
      |> Datum.DataOrigin.create_origin()

    origin
  end
end
