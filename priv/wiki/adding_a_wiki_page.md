# Adding a Wiki Page

DeepLynx ships with an internal wiki, available to all users and developers of the application. This wiki strives to be up to date with the codebase, and should be updated along with any code changes proposed.


#### Adding a Page
1. If you've installed the development ecosystem - you can simply run `mix wiki.gen` from the root of the project, appending the title of your wiki article at the end of the command. Example: `mix wiki.gen New Article Title`. Your new article will appear in the `priv/wiki` repository.

2. (Optional) The `mix wiki.gen` command also creates an entry in the Table of Contents which shows on the sidebar. You may edit the table of contents by changing the entries in `priv/wiki/table_of_contents.md`. 