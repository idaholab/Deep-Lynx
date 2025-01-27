# uncomment this line if you're behind a corporate firewall
# :public_key.cacerts_load("/Users/Shared/CAINLROOT_B64.crt")

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
      deps: deps()
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Datum.Application, []},
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
      {:adbc, "0.7.3"},
      {:bcrypt_elixir, "~> 3.2"},
      {:phoenix, "~> 1.7.14"},
      {:phoenix_ecto, "~> 4.5"},
      {:ecto_sql, "~> 3.10"},
      {:ecto_sqlite3, "~> 0.16.0"},
      {:exqlite, "0.22.0"},
      {:phoenix_html, "~> 4.1"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:phoenix_live_view, "~> 1.0.0", override: true},
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
      {:shortuuid, "~> 3.0"},
      {:uuid, "~> 1.1.8"},
      {:wasmex, "~> 0.9.2"},
      {:rustler, "~> 0.35.0", override: true},
      {:closure_table, "~> 2.0"},
      {:yaml_elixir, "~> 2.11"},
      {:gen_smtp, "~> 1.1"},
      {:prompt, "~> 0.10.0"},
      {:explorer, "~> 0.10.1"},
      {:ymlr, "~> 5.1"},
      {:vega_lite, "~> 0.1.11"},
      {:vega_lite_convert, "~> 1.0"},
      {:erlport, "~> 0.11.0"},
      {:mix_audit, "~> 2.1"},
      {:langchain, "~> 0.3.0-rc.0"},
      {:tdms_parser, git: "https://github.com/DnOberon/tdms-parser", branch: "master"},
      {:sobelow, "~> 0.13", only: [:dev, :test], runtime: false},
      {:earmark, "~> 1.4"},
      {:crc32cer, "~> 0.1.11"},
      {:oban, "~> 2.18"},
      {:file_system, "~> 1.0"},
      {:slipstream, "~> 1.1"},
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
      translations: ["gettext.extract", "gettext.merge priv/gettext --locale en"],
      "ecto.setup": ["database.clean", "ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: [
        "database.clean",
        "ecto.create --quiet",
        "ecto.migrate --quiet",
        "test --exclude tdms"
      ],
      "assets.setup": [
        "cmd cd assets && npm install",
        "tailwind.install --if-missing",
        "esbuild.install --if-missing"
      ],
      "assets.build": ["tailwind datum", "esbuild datum"],
      "assets.deploy": [
        "tailwind datum --minify",
        "esbuild datum --minify",
        "phx.digest"
      ],
      # sqlite fetch _should_ handle getting all the required extensions we need and install them locally
      "sqlite.fetch": [
        "cmd cd priv/sqlite_extensions && curl -o install_vec.sh https://github.com/asg017/sqlite-vec/releases/download/v0.1.6/install.sh | sh",
        "cmd cd priv/sqlite_extensions && sh install.sh"
      ]
    ]
  end
end
