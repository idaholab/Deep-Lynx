defmodule Datum.MixProject do
  use Mix.Project

  def project do
    [
      app: :datum,
      version: "0.0.1",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      releases: releases()
    ]
  end

  def releases do
    [
      datum: [
        steps: [:assemble, &Burrito.wrap/1],
        burrito: [
          targets: [
            macos: [os: :darwin, cpu: :aarch64],
            linux: [os: :linux, cpu: :x86_64]
            # windows: [os: :windows, cpu: :x86_64] uncomment once we figure out how to build for windows on macos
          ]
        ]
      ]
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Datum.Application, ["server"]},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:argon2_elixir, "~> 3.0"},
      {:phoenix, "~> 1.7.14"},
      {:phoenix_ecto, "~> 4.5"},
      {:ecto_sql, "~> 3.10"},
      {:ecto_sqlite3, "~> 0.16.0"},
      {:phoenix_html, "~> 4.1"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      # TODO bump on release to {:phoenix_live_view, "~> 1.0.0"},
      {:phoenix_live_view, "~> 1.0.0-rc.6", override: true},
      {:floki, ">= 0.30.0", only: :test},
      {:phoenix_live_dashboard, "~> 0.8.3"},
      {:esbuild, "~> 0.8", runtime: Mix.env() == :dev},
      {:tailwind, "~> 0.2", runtime: Mix.env() == :dev},
      {:heroicons,
       github: "tailwindlabs/heroicons",
       tag: "v2.1.1",
       sparse: "optimized",
       app: false,
       compile: false,
       depth: 1},
      {:swoosh, "~> 1.15.0"},
      {:mime, "~> 2.0"},
      {:finch, "~> 0.13"},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.0"},
      {:gettext, "~> 0.20"},
      {:jason, "~> 1.2"},
      {:dns_cluster, "~> 0.1.1"},
      {:bandit, "~> 1.5"},
      {:burrito, "~> 1.1"},
      {:shortuuid, "~> 3.0"},
      {:elixir_uuid, "~> 1.2"},
      {:wasmex, "~> 0.9.1"},
      {:closure_table, "~> 2.0"},
      {:yaml_elixir, "~> 2.11"},
      {:gen_smtp, "~> 1.1"},
      {:prompt, "~> 0.10.0"},
      {:explorer, "~> 0.9.2"},
      {:ymlr, "~> 5.1"},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # For example, to install project dependencies and perform other setup tasks, run:
  #
  #     $ mix setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      setup: [
        "deps.get",
        "ecto.setup",
        "assets.setup",
        "assets.build",
        "sqlite.fetch"
      ],
      "ecto.setup": ["clean.db", "ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      "clean.db": ["cmd rm -rf databases"],
      test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"],
      "assets.setup": ["tailwind.install --if-missing", "esbuild.install --if-missing"],
      "assets.build": ["tailwind datum", "esbuild datum"],
      "assets.deploy": [
        "tailwind datum --minify",
        "esbuild datum --minify",
        "phx.digest"
      ],
      "sqlite.fetch": [
        "cmd cd priv/sqlite_extensions && curl -L https://github.com/asg017/sqlite-vec/releases/download/v0.1.1/install.sh | sh",
        "cmd cd priv/sqlite_extensions && sh install.sh"
      ]
    ]
  end
end
