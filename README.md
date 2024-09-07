# Datum

## Gotchas for Development

- Might need to fix your Zig install for Burrito - https://ziggit.dev/t/what-to-fix-this-related-libsystem-build-error/5387/3

## Requirements
 - elixir 1.17-otp-27
 - erlang 27.0
 - Node.js and NPM - latest LTS should work just fine
 - Mix (should be installed with Elixir)
 - **optional**: asdf, asdf elixir and erlang plugins


 ## Running
 1. Run `mix deps.get && mix deps.compile`: this should fetch and compile project dependencies
 2. Run `mix setup`: this will remove any old databases and rebuild the Operations Sqlite3 database, as well as run its migrations, should cover everything else like fetching sqlite3 and required plugins
 3. Run `mix phx.server`: this should now just....work - no further configuration should be necessary, but be sure to at least peruse `config/dev.exs`


 ## Editors
 We recommend either [VSCode](https://fly.io/phoenix-files/setup-vscode-for-elixir-development/), [Neovim](https://elixirforum.com/t/neovim-elixir-setup-configuration-from-scratch-guide/46310), or [Zed](https://zed.dev/docs/languages/elixir).

 You might need to additionally install the language servers yourself, if the editors have a hard time doing so. We recommend either ElixirLS or Next-LS for now.
