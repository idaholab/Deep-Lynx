defmodule Datum.DataOrigin.ExtractedMetadata do
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
