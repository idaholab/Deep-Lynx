defmodule Datum.DataOrigin.ExtractedMetadata do
  @moduledoc """
  Playing around with this currently - we're thinking that we need the extracted metadata to be
  decomposed or normalized into the database structure so that we can do semantic search either via
  FTS5 or vector search. Definitely a work in progress structure.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "extracted_metadatas" do
    field :data, :binary_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(extracted_metadata, attrs) do
    extracted_metadata
    |> cast(attrs, [])
    |> validate_required([])
  end
end
