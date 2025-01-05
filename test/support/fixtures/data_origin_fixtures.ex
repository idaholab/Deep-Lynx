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
        name: "some name",
        type: :filesystem,
        config: %{
          "path" => "/some/nonexistent/path/two",
          "description" => "keyword description",
          "tags" => ["tag", "hello"],
          "domains" => ["domain"],
          "type" => "file"
        }
      })
      |> Datum.DataOrigin.create_origin()

    {:ok, _perm} =
      Datum.Permissions.create_data_origin(%{
        data_origin_id: origin.id,
        user_id: origin.owned_by,
        permission_type: :readwrite
      })

    origin
  end

  @doc """
  Generate a extracted_metadata.
  """
  def extracted_metadata_fixture(attrs \\ %{}) do
    {:ok, extracted_metadata} =
      attrs
      |> Enum.into(%{})
      |> Datum.DataOrigin.create_extracted_metadata()

    extracted_metadata
  end
end
