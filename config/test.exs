import Config

# Only in tests, remove the complexity from the password hashing algorithm
config :argon2_elixir, t_cost: 1, m_cost: 8

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :datum,
  origin_db_path: Path.join([System.user_home(), "/.datum_test_databases", "origins"])

config :datum, Datum.Repo,
  database: Path.join([System.user_home(), "/.datum_test_databases", "operations_test.db"]),
  journal_mode: :wal,
  auto_vacuum: :incremental,
  datetime_type: :iso8601,
  pool: Ecto.Adapters.SQL.Sandbox,
  load_extensions: [
    "./priv/sqlite_extensions/crypto",
    "./priv/sqlite_extensions/fileio",
    "./priv/sqlite_extensions/fuzzy",
    "./priv/sqlite_extensions/math",
    "./priv/sqlite_extensions/stats",
    "./priv/sqlite_extensions/text",
    "./priv/sqlite_extensions/unicode",
    "./priv/sqlite_extensions/uuid",
    "./priv/sqlite_extensions/vec0",
    "./priv/sqlite_extensions/vsv"
  ]

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :datum, DatumWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "rK3Soo6Gy4EbbhweEHpRj0AocgG4FgT29Qa7o78aVjYxTEAQZs2vaQsS2ae8nwyc",
  server: false

# In test we don't send emails
config :datum, Datum.Mailer, adapter: Swoosh.Adapters.Test

# Disable swoosh api client as it is only required for production adapters
config :swoosh, :api_client, false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Enable helpful, but potentially expensive runtime checks
config :phoenix_live_view,
  enable_expensive_runtime_checks: true
