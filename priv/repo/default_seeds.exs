# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:
#
#     Datum.Repo.insert!(%Datum.SomeSchema{})
#
# We recommend using the bang functions (`insert!`, `update!`
# and so on) as they will fail if something goes wrong.

# This particular seed file is for building the default plugins needed by the system
{:ok, %Datum.Plugins.Plugin{} = _plugin} =
  Datum.Plugins.create_plugin(%{
    name: "TDMS Metadata",
    module_type: :elixir,
    module_name: Datum.Plugins.TdmsIndex,
    filetypes: [".tdms_index", ".tdms"],
    plugin_type: :extractor
  })

{:ok, %Datum.Plugins.Plugin{} = _plugin} =
  Datum.Plugins.create_plugin(%{
    name: "CSV Extractor",
    module_type: :elixir,
    module_name: Datum.Plugins.CSV,
    filetypes: [".csv", "text/csv"],
    plugin_type: :extractor
  })

{:ok, %Datum.Plugins.Plugin{} = _plugin} =
  Datum.Plugins.create_plugin(%{
    name: "Parquet Extractor",
    module_type: :elixir,
    module_name: Datum.Plugins.Parquet,
    filetypes: [".pqt", "parquet", "application/vnd.apache.parquet"],
    plugin_type: :extractor
  })
