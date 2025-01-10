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
    Req.get(client.endpoint |> URI.append_path("/api/v1/plugins"),
      auth: set_auth(client),
      plug: client.plug
    )
    |> format_response()
  end

  @doc """
    Same as list_plugins/1 but raises an exception on unexpected response or error
  """
  def list_plugins!(%__MODULE__{} = client) do
    %{status: 200, body: plugins} =
      Req.get!(client.endpoint |> URI.append_path("/api/v1/plugins"),
        auth: set_auth(client),
        plug: client.plug
      )

    plugins
  end

  @doc """
  Lists all DataOrigins from the database user has access to 
  """
  def list_origins(%__MODULE__{} = client) do
    Req.get(client.endpoint |> URI.append_path("/api/v1/origins"),
      auth: set_auth(client),
      plug: client.plug
    )
    |> format_response()
  end

  @doc """
    Same as list_origins/1 but raises an exception on unexpected response or error
  """
  def list_origins!(%__MODULE__{} = client) do
    %{status: 200, body: origins} =
      Req.get!(client.endpoint |> URI.append_path("/api/v1/origins"),
        auth: set_auth(client),
        plug: client.plug
      )

    origins
  end

  def create_origin(%__MODULE__{} = client, params) do
    Req.put(client.endpoint |> URI.append_path("/api/v1/origins"),
      json: params,
      auth: set_auth(client),
      plug: client.plug
    )
    |> format_response(expected_status_code: 201)
  end

  def create_origin!(%__MODULE__{} = client, params) do
    %{status: 201, body: origin} =
      Req.put!(client.endpoint |> URI.append_path("/api/v1/origins"),
        json: params,
        auth: set_auth(client),
        plug: client.plug
      )

    origin
  end

  @doc """
  Gets current user information for supplied token - we only provide id and email here, we don't want people
  token fishing.
  """
  def current_user_info(%__MODULE__{} = client) do
    Req.get(client.endpoint |> URI.append_path("/api/v1/user"),
      auth: set_auth(client),
      plug: client.plug
    )
    |> format_response()
  end

  @doc """
  Same as current_user_info/1 but throws an exception on error
  """
  def current_user_info!(%__MODULE__{} = client) do
    %{status: 200, body: user} =
      Req.get!(client.endpoint |> URI.append_path("/api/v1/user"),
        auth: set_auth(client),
        plug: client.plug
      )

    user
  end

  @doc """
  Uploads a local DataOrigin database file to the central server. 
  """
  def upload_data_origin(%__MODULE__{} = client, origin_db_path) do
    Req.post(client.endpoint |> URI.append_path("/api/v1/data_origins"),
      auth: set_auth(client),
      plug: client.plug,
      form_multipart: [database: File.stream!(origin_db_path)]
    )
    |> format_response()
  end

  @doc """
  Same as upload_data_origin/2 but raises if there is an error
  """
  def upload_data_origin!(%__MODULE__{} = client, origin_db_path) do
    %{status: 200} =
      Req.post!(client.endpoint |> URI.append_path("/api/v1/data_origins"),
        auth: set_auth(client),
        plug: client.plug,
        form_multipart: [database: File.stream!(origin_db_path)]
      )

    :ok
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
