# Datum

## Requirements
 - elixir 1.17-otp-27 (on Mac, `brew install elixir` should install both elixir and erlang otp for you)
    - We recommend installing from either `brew` or the official site if you are not using `asdf`.
 - erlang 27.0
 - zig
 - Node.js and NPM - latest LTS should work just fine
 - Mix (should be installed with Elixir)
 - **optional**: asdf, asdf elixir and erlang plugins - read on the sites how to use them.

## Running the CLI
1. To run the CLI you must first get and compile the dependencies - `mix deps.get && mix deps.compile`.
2. Run `mix setup` this will remove any old databases and rebuild the Operations Sqlite3 database, as well as run its migrations, should cover everything else like fetching sqlite3 and required plugins
3. To run the CLI you must typically provide an argument, no argument will run the server. In order to provide an argument and run the CLI you must use `mix run -- argument`. e.g `mix run -- init`. 

 ## Running the webserver
 1. Run `mix deps.get && mix deps.compile`: this should fetch and compile project dependencies
 2. Run `mix setup`: this will remove any old databases and rebuild the Operations Sqlite3 database, as well as run its migrations, should cover everything else like fetching sqlite3 and required plugins
 3. Run `mix phx.server`: this should now just....work - no further configuration should be necessary, but be sure to at least peruse `config/dev.exs`

## Running the tests
 1. Run `mix deps.get && mix deps.compile`: this should fetch and compile project dependencies
 2. Run `mix test`

## Gotchas for Development

- Might need to fix your Zig install for Burrito - https://ziggit.dev/t/what-to-fix-this-related-libsystem-build-error/5387/3
- Behind a corporate firewall you might need to set your CA certificate for Mix. 
    1. Set the env var `HEX_CACERTS_PATH` - point to your certs
    2. Uncomment the top line in the `mix.exs` file and change the path to reflect the path to your cert
    3. In your `config/config.exs` file - add a comma to lines 44 and 57, then add `cacerts_path: "PATH TO YOUR CERT"` to lines 45 and 58.


 ## Editors
 We recommend either [VSCode](https://fly.io/phoenix-files/setup-vscode-for-elixir-development/), [Neovim](https://elixirforum.com/t/neovim-elixir-setup-configuration-from-scratch-guide/46310), or [Zed](https://zed.dev/docs/languages/elixir).

 You might need to additionally install the language servers yourself, if the editors have a hard time doing so. We recommend either Lexical or ElixirLS for now.

