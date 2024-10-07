defmodule Datum.ScannerFixtures do
  @moduledoc """
  This module defines test helpers for working with scanners.
  """

  def setup() do
    test_path = Path.join(__DIR__, "filesystem_scanner")
    delete_directory(test_path)

    File.mkdir!(test_path)
    generate_files(test_path, 2)
    test_path
  end

  def teardown do
    test_path = Path.join(__DIR__, "filesystem_scanner")
    delete_directory(test_path)
  end

  defp generate_files(path, depth) do
    if depth > 0 do
      # Generate a random number of files between 5 and 10
      num_files = Enum.random(5..10)

      for i <- 1..num_files do
        # Write a file with random data
        File.write!(Path.join([path, "file#{i}"]), <<Enum.random(0..255)>>)
      end

      # Generate a random number of directories between 3 and 7
      num_dirs = Enum.random(3..7)

      for i <- 1..num_dirs do
        dir = Path.join([path, "directory#{i}"])
        # Create the directory
        File.mkdir!(dir)
        # Recursively call generate_files on the new directory with a reduced depth
        generate_files(dir, depth - 1)
      end
    end
  end

  @doc """
  Delete a directory and remove all files
  """
  def delete_directory(path) do
    # Expand the path to its absolute form
    path = Path.expand(path)
    if File.dir?(path), do: delete_recursively(path), else: :error
  end

  defp delete_recursively(path) do
    # Get a list of all entities in the directory
    entries = Enum.map(File.ls!(path), fn entry -> Path.join([path, entry]) end)

    for entry <- entries do
      # Recursively call delete_recursively on directories and delete files directly
      if File.dir?(entry), do: delete_recursively(entry), else: File.rm!(entry)
    end

    # Finally, delete the directory itself
    File.rmdir!(path)
  end
end
