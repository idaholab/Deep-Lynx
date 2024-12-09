defmodule Mix.Tasks.Wiki.Gen do
  @moduledoc """
  Generates a new wiki page and adds to the table of contents. Name should be
  the full, captilized name of the post - e.g Table of Contents
  """
  @shortdoc "Generates a wiki page"

  use Mix.Task

  @impl Mix.Task
  def run(args) do
    # build filename
    filename = args |> Enum.map_join("_", fn arg -> String.downcase(arg) |> URI.encode() end)
    path = Path.join(Application.app_dir(:datum), "priv/wiki/#{filename}.md")

    if File.exists?(path) do
      IO.puts("Wiki page already exists by this name!")
    else
      toc_path = Path.join(Application.app_dir(:datum), "priv/wiki/table_of_contents.md")

      # write the wiki page first, we can add to this template if we'd like
      path
      |> File.write(
        """
        # #{Enum.join(args, " ")}
        """,
        [:write, :append]
      )

      # write out a new entry to the table of contents
      toc_path
      |> File.write(
        """
        * [#{Enum.join(args, " ")}](wiki/#{filename})
        """,
        [:write, :append]
      )
    end
  end
end
