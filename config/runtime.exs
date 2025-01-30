import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.
config :datum, DatumWeb.Endpoint, server: true

config :datum, DatumWeb.Endpoint,
  origin_db_path: Path.join([System.user_home(), "/.datum_databases", "origins"])

if config_env() == :prod do
  config_file_path =
    System.user_home() |> Path.join(".config") |> Path.join(".datum_config.yaml")

  vars = %{
    server_ssl: System.get_env("SERVER_SSL", "FALSE") |> String.upcase() == "TRUE",
    force_ssl: System.get_env("FORCE_SSL", "FALSE") |> String.upcase() == "TRUE",
    database_path:
      System.get_env(
        "DATABASE_PATH",
        Path.join([System.user_home(), "/.datum_databases", "operations.db"])
      ),
    secret_key_base: System.get_env("SECRET_KEY_BASE"),
    host: System.get_env("PHX_HOST"),
    port: String.to_integer(System.get_env("PORT", "4000")),
    ssl_keyfile_path: System.get_env("SSL_KEYFILE_PATH"),
    ssl_cert_path: System.get_env("SSL_CERT_PATH"),
    dns_cluster_query: System.get_env("DNS_CLUSTER_QUERY"),
    ai: %{
      openai_enabled: System.get_env("OPENAI_ENABLED", "FALSE"),
      openai_endpoint:
        System.get_env("OPENAI_ENDPOINT", "http://localhost:11434/v1/chat/completions"),
      openai_key: System.get_env("OPENAI_KEY", "ollama"),
      openai_model: System.get_env("OPENAI_MODEL", "llama3.2"),
      openai_temp: System.get_env("OPENAI_TEMP", "0")
    },
    smtp:
      if System.get_env("USE_SMTP_MAILER", "FALSE") |> String.upcase() == "TRUE" do
        %{
          relay: System.get_env("SMTP_RELAY"),
          username: System.get_env("SMTP_USERNAME"),
          password: System.get_env("SMTP_PASSWORD"),
          ssl: System.get_env("SMTP_SSL", "FALSE") |> String.upcase() == "TRUE",
          tls: System.get_env("SMTP_TLS"),
          auth: System.get_env("SMTP_TLS"),
          port: System.get_env("SMTP_PORT")
        }
      else
        nil
      end
  }

  vars =
    case YamlElixir.read_from_file(config_file_path) do
      {:ok, yaml_file_data} ->
        Map.merge(vars, yaml_file_data)

      _ ->
        IO.puts(
          "No .datum_config.yaml detected - generate one with 'datum init', falling back to environment variables..."
        )

        vars
    end

  config :datum, Datum.Repo,
    database: vars.database_path,
    journal_mode: :wal,
    auto_vacuum: :incremental,
    datetime_type: :iso8601,
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

  config :datum, :dns_cluster_query, vars.dns_cluster_query

  config :datum, DatumWeb.Endpoint,
    url: [host: vars.host, port: 443, scheme: "https"],
    http: [
      ip: {0, 0, 0, 0},
      port: vars.port
    ],
    secret_key_base: vars.secret_key_base

  if vars.ai do
    config :datum,
      openai_enabled: vars.ai.openai_enabled,
      openai_endpoint: vars.ai.openai_endpoint,
      openai_key: vars.ai.openai_key,
      openai_model: vars.ai.openai_model,
      openai_temp: vars.ai.openai_temp
  end

  if vars.server_ssl do
    config :datum, DatumWeb.Endpoint,
      force_ssl: [hsts: true],
      https: [
        port: 443,
        cipher_suite: :strong,
        keyfile: vars.ssl_keyfile_path,
        certfile: vars.ssl_cert_path
      ]
  end

  if vars.smtp do
    config :datum, Datum.Mailer,
      adapter: Swoosh.Adapters.SMTP,
      relay: vars.smtp.relay,
      username: vars.smtp.username,
      password: vars.smtp.password,
      ssl: vars.smtp.ssl,
      tls: String.to_atom(vars.stmtp.tls),
      auth: String.to_atom(vars.stmtp.auth),
      port: vars.smtp.port
  end
end
