defmodule Datum.Plugins.HDF5 do
  use Rustler, otp_app: :datum, crate: "hdf5_extractor"

  @moduledoc """
  General metadata extraction for HDF5 files.

  This module provides functionality to extract metadata from HDF5 files,
  leveraging Rust. HDF5 (Hierarchical Data Format version 5)
  is a file format and set of tools for managing complex data. This module
  aims to facilitate the extraction of metadata such as dataset names,
  group names, attributes and other information from HDF5 files.

  The extraction functionality is implemented using the `hdf5-rust` library,
  which is a wrapper around the HDF5 C library. This allows efficient
  interaction with HDF5 files. The `rustler` library is used to enable
  integration between Rust and Elixir, providing the necessary
  bindings to call Rust functions from Elixir code.

  https://github.com/rusterlium/rustler

  Extract metadata from an HDF5 file
  metadata = Datum.Plugins.HDF5.extract("path/to/file.h5", [])
  """

  def extract(_file_path, _opts) do
    :erlang.nif_error(:nif_not_loaded)
  end
end
