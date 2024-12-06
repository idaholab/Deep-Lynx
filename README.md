# DeepLynx Elixir Setup

## Requirements

- Elixir 1.17-otp-27 
    - Mac: run `brew install elixir`
    - Windows: Use the appropriate installer found [here](https://elixir-lang.org/install.html#windows). If installing via exe, choose the `Elixir 1.17.3 on Erlang 27` option
- Erlang 27.0 (should come with Elixir installation)
- [Zig](https://ziglang.org/download/) : used for binary compilation, install using the link or on Mac via `brew install zig`
- [Node.js and NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm): used for UI libraries
- Mix (should come with Elixir installation installed)
- **optional**: [asdf](https://asdf-vm.com/guide/getting-started.html): version manager for Elixir, not available on Windows

### VSCode Extensions

Visual Studio Code with a few extensions is primarily recommended as the editor of choice for Elixir/Phoenix. Extensions are available through the extensions tab on the left column of VS Code and typed into the search bar. These extensions help with linting and coding hints to ease the development experience. **Note**: Users of IntelliJ should be aware that there is no support for Phx HEEx templates and that it is recommended to use VSC or at least Zed or Neovim instead. 

- Credo: a static code analysis tool providing code annotations which include best practices and warnings or errors before being compiled to the BEAM. The main extension is by pantajoe. ![alt text](assets/README/credo.png)
- Lexical: the base for the new language server that the Elixir team is funding. ![alt text](assets/README/lexical.png)
- Phoenix Framework extension: recommended for the web application. ![alt text](assets/README/phx.png)

## Working Under Enterprise CA (Dealing with Cert Errors)

### Modifying Environment Variables

Hex uses an environment variable called `HEX_CACERTS_PATH` set to your certificate bundle. This will resemble the following: 
```sh
export HEX_CACERTS_PATH=/path/to/YOUR_COMPANY_CERT.crt
```
and be added to a .bash_profile or preferred environment variable configuration. Failure to do this will result in an SSL error.

After adding this variable to your profile, be sure to either close and reopen your terminal, or run `source ~/.bash_profile` (replacing bash_profile with your preferred env config file) to load the environment variable into your current terminal.

### Modifying `mix.esx`

Uncomment the top line in the `mix.exs` file and change the path to reflect the path to your cert. ![alt text](assets/README/mixexs.png)

### Modifying `config/config.exs`

You also need to modify the configuration file in `config/config.exs`, adding `cacerts_path: "/path/to/YOUR_COMPANY_CERT"` to the following lines like so: ![alt text](assets/README/configexs.png)

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

## The File Structure
The majority of development will be done in the lib folder with tests written in the aptly named test folder. Within lib, the datum_web folder is where the front-end views as well as their respective controller code reside, in addition to the front end router. The regular datum folder holds backend models and typically hosts business logic and business domain as well as DB interactions. 

## Useful Links

### Documentation

- [Elixir Docs](https://hexdocs.pm/elixir/1.17.3/Kernel.html)
- [Mix Docs](https://hexdocs.pm/mix/1.17.3/Mix.html)
- [Phoenix Docs](https://hexdocs.pm/phoenix/Phoenix.html)
- [LiveView Docs](https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html)
- [Flame Docs](https://hexdocs.pm/flame/FLAME.html)

### Guides & Training

- [Elixir Learning](https://elixir-lang.org/learning.html)
- [Exercism Track](https://exercism.org/tracks/elixir)
- [Elixir Koans](https://github.com/elixirkoans/elixir-koans)
- [Pattern Matching in Elixir](https://hexdocs.pm/elixir/pattern-matching.html)
- [Strong arrows blog post: Elixir's path to a type system](https://elixir-lang.org/blog/2023/09/20/strong-arrows-gradual-typing/)