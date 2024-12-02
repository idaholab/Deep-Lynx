defmodule Datum.Search do
  @moduledoc """
  Search is a GenServer (https://hexdocs.pm/elixir/GenServer.html) which is in charge of dispatching
  a user search across all the data origins - because each origin is it's own database we had a few
  ways of approaching this - from attaching and combining tables in a single sqlite3 db, to doing this
  concurrent search. We chose the concurrent search because there might be hundreds or more data origins
  and that could easily break an SQL query, not to mention potentially swamp a single database.
  """
  require Logger
  alias Datum.Accounts.User
  alias Datum.DataOrigin
  use GenServer

  # Client
  def start_link(default) do
    GenServer.start_link(__MODULE__, default, name: __MODULE__)
  end

  @doc """
  Search across all Data Origins apart from those in the excluded list. These searches
  will run concurrently in a SupervisedTask.
  """
  def search_origins(pid, %User{} = user, term, opts \\ []) do
    GenServer.call(pid, {:search_origins, user, term, opts})
  end

  # Server (callbacks)
  @impl true
  def init(state) do
    {:ok, state}
  end

  # we threw the limit tag on here so it wouldn't time out - we might want to eventually turn this
  # into an async call at some point though
  @limit 10_000
  @impl true
  def handle_call({:search_origins, user, term, opts}, _from, state) do
    exclude = Keyword.get(opts, :exclude, [])
    page = Keyword.get(opts, :page, 0)
    page_size = Keyword.get(opts, :page_size, @limit)

    # first pull all the origins we want to search across
    origins = DataOrigin.list_data_orgins_user(user, exclude)

    # we iterate through the origins, running the search on each
    statuses =
      Task.Supervisor.async_stream_nolink(
        Datum.TaskSupervisor,
        origins,
        fn origin ->
          DataOrigin.search_origin(origin, user, term, page: page, page_size: page_size)
        end
      )
      |> Stream.map(fn
        {:ok, results} -> {:ok, results}
        {:exit, reason} -> {:error, "search task exited: #{Exception.format_exit(reason)}"}
      end)

    # log the errors, but don't return potential errors to the user - as some of them
    # might error because don't have access, old data etc.
    # TODO: maybe save the search results in the DB so we can log the errors?
    statuses
    |> Enum.filter(&match?({:error, _}, &1))
    |> Enum.each(fn {:error, message} -> Logger.error(message) end)

    {_s, result_sets} = statuses |> Enum.filter(&match?({:ok, _}, &1)) |> Enum.unzip()

    {:reply, List.flatten(result_sets), state}
  end
end
