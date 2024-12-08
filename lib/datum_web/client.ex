defmodule DatumWeb.Client do
  @moduledoc """
  This is the HTTP client for the application.
  """
  @enforce_keys [:endpoint]
  defstruct [:endpoint, :token, :plug]

  @doc """
  Options contain things like the token for Bearer authentication.
  """
  def new(endpoint, opts \\ []) do
    case URI.new(endpoint) do
      {:ok, uri} ->
        {:ok,
         %__MODULE__{
           endpoint: uri,
           token: Keyword.get(opts, :token),
           plug: Keyword.get(opts, :plug)
         }}

      _ ->
        {:error, "unable to parse endpoint"}
    end
  end

  def new!(endpoint, opts \\ []) do
    %__MODULE__{
      endpoint: URI.new!(endpoint),
      token: Keyword.get(opts, :token),
      plug: Keyword.get(opts, :plug)
    }
  end

  @doc """
  Lists all Plugins from the database user has access to - *does not* return the actual plugin
  """
  def list_plugins(%__MODULE__{} = client) do
    Req.get("#{client.endpoint}", auth: set_auth(client), plug: client.plug)
    |> format_response()
  end

  @doc """
    Same as list_plugins/1 but raises an exception on unexpected response or error
  """
  def list_plugins!(%__MODULE__{} = client) do
    %{status: 200, body: plugins} =
      Req.get!("#{client.endpoint}", auth: set_auth(client), plug: client.plug)

    plugins
  end

  # just an easy way to wrap our response and give back a tuple with
  # the content - we'll want to continually evolve this as our calls get
  # more complex, but this is good enough for now - ONLY USE with normal results
  # not the bang alternatives
  defp format_response(resp, opts \\ []) do
    expected_status_code = Keyword.get(opts, :expected_status_code, 200)

    case resp do
      {:ok, %{status: status, body: body}} ->
        if status == expected_status_code do
          {:ok, body}
        else
          {:error, :unexpected_status_code, body}
        end

      _ ->
        {:error, :req_error}
    end
  end

  # decides if it should return an auth tuple for Req depending on
  # token - just saves us from having to type this out all the tim
  defp set_auth(%__MODULE__{} = client) do
    if client.token do
      {:bearer, client.token}
    else
      nil
    end
  end
end
