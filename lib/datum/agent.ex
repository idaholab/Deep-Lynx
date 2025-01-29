defmodule Datum.Agent do
  @moduledoc """
  Agent is a GenServer (https://hexdocs.pm/elixir/GenServer.html) which is in charge of running the
  AI Assistant for Datum. Each instance of the GenServer is an individual agent, interacting with one
  single individual user.

  Also, _all_ interacts with this genserver should be done asynchronously so that we avoid the application
  hanging while waiting for an agent's response, as those could be time consuming depending on hardware and
  load. The agent should require a parent pid on init, and then send replies back to that pid on messgages
  it generates.

  We use Elixir LangChain normally, with the OpenAI agent - typically talking to an Ollama background.
  """
  use GenServer
  require Logger

  alias LangChain.ChatModels.ChatOpenAI
  alias LangChain.Function
  alias LangChain.FunctionParam
  alias LangChain.Message
  alias LangChain.Chains.LLMChain

  # Client
  def start_link(%{parent: _parent_pid, user: _user, name: name} = default) do
    GenServer.start_link(__MODULE__, default, name: name)
  end

  @doc """
  Send message will take a user's provided text query, perform any formatting needed, and then send it to
  the agent. This is an async task - replies should be listened to.
  """
  def send_message(pid, message, opts \\ []) do
    GenServer.cast(pid, {:send_message, message, opts})
  end

  @doc """
  Send context will take a provided context as a map,  and then send it to the agent. This is useful for setting
  things lke the current user, sending it data to be aware of etc.

  This is an async task - replies should be listened to.
  """
  def send_context(pid, context, opts \\ []) when is_map(context) do
    GenServer.cast(pid, {:send_context, context, opts})
  end

  # Server
  @impl true
  def init(%{parent: _parent_pid, user: user} = state) do
    chat_model =
      ChatOpenAI.new!(%{
        model: Application.get_env(:datum, :openai_model),
        api_key: Application.get_env(:datum, :openai_key),
        temperature: Application.get_env(:datum, :openai_temp),
        endpoint: Application.get_env(:datum, :openai_endpoint),
        # we don't stream the results, no need
        stream: false
      })

    # TODO: this function setup probably needs a lot of work. Either we need to update the elixir lang package
    # with ollama function support directly, or we need to handle weird edge cases better
    search_function =
      Function.new!(%{
        name: "search",
        parameters: [
          FunctionParam.new!(%{
            name: "query",
            type: :string,
            required: true,
            description: "The user's search as a comma-delimited list of keywords"
          })
        ],
        description:
          "Returns a JSON array of search results across all the data and data origins a user has access to",
        function: fn %{"query" => query} = _args, _context ->
          # This uses the user_id provided through the context to call our Elixir function.
          {:ok, Jason.encode!(Datum.Search.search_origins(Datum.Search, user, query))}
        end
      })

    # TODO: this is a temporary function - as we will definitely outgrow the ability to send the entire wiki
    # as context. We will need to build a way to chunk and do relevant text to the LLM from the wiki
    wiki_function =
      Function.new!(%{
        name: "wiki",
        parameters: [],
        description:
          "Returns all text in the wiki. Useful for when users want to know how to do something in the application.",
        function: fn _args, _context ->
          # This uses the user_id provided through the context to call our Elixir function.
          {:ok, Jason.encode!(combine_text(Path.join(Application.app_dir(:datum), "priv/wiki")))}
        end
      })

    # tweak this system prompt as needed
    system_message =
      Message.new_system!(~s(You are a helpful assistant. Your answers must be brief and correct.
      Brief and short. Do not repeat vast amounts of information unlesss specifically asked and tasked
      to do so.If you are uncertain about something, never make up possible information, instead state
      and admit that you do not know the thing.))

    chain =
      %{llm: chat_model, verbose: true}
      |> LLMChain.new!()
      |> LLMChain.add_messages([system_message])
      |> LLMChain.add_tools([search_function, wiki_function])

    {:ok, state |> Map.put(:chain, chain)}
  end

  @impl true
  def handle_cast({:send_message, message, _opts}, state) do
    case state.chain
         |> LLMChain.add_message(Message.new_user!(message))
         |> LLMChain.run(mode: :while_needs_response) do
      {:ok, updated_chain} ->
        send(
          state.parent,
          {:new_message,
           %{id: UUID.uuid4(), message: "#{updated_chain.last_message.content}", origin: :ai}}
        )

        {:noreply, %{state | chain: updated_chain}}

      {:error, updated_chain, error} ->
        Logger.error("error in LLM agent #{error.message}")

        send(
          state.parent,
          {:new_message,
           %{
             id: UUID.uuid4(),
             message:
               ~s(I'm sorry, I was unable to complete the request. If you continue to experience errors, please contact support.),
             origin: :ai
           }}
        )

        {:noreply, %{state | chain: updated_chain}}
    end
  end

  @impl true
  def handle_cast({:send_context, _context, _opts}, state) do
    {:noreply, state}
  end

  @doc """
  Reads all files in the specified directory,
  combines their contents into one string, and returns it.
  """
  def combine_text(directory) when is_binary(directory) do
    File.ls!(directory)
    |> Enum.reduce("", fn file, acc ->
      case File.read(Path.join(directory, file)) do
        {:ok, content} ->
          content <> acc

        _ ->
          acc
      end
    end)
  end
end
