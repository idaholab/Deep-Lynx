defmodule DatumWeb.Router do
  use DatumWeb, :router

  import DatumWeb.UserAuth

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {DatumWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :fetch_current_user
  end

  pipeline :api do
    plug :accepts, ["json"]
    # the plug below also sets the current user
    plug :require_authenticated_token
  end

  scope "/api/v1", DatumWeb do
    pipe_through :api

    get "/plugins", PluginsController, :list_info
    get "/user", UserSessionController, :user_details
    get "/origins", OriginController, :list
    put "/origins", OriginController, :create
    get "/origins/:origin_id", OriginController, :fetch
    get "/origins/:origin_id/data", OriginController, :root_directory
    put "/origins/:origin_id/data", OriginController, :create_data

    get "/origins/:origin_id/data/:data_id", OriginController, :fetch_data
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:datum, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: DatumWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end

  ## Authentication routes
  scope "/", DatumWeb do
    pipe_through [:browser, :redirect_if_user_is_authenticated]

    live_session :redirect_if_user_is_authenticated,
      on_mount: [{DatumWeb.UserAuth, :redirect_if_user_is_authenticated}] do
      live "/users/register", UserRegistrationLive, :new
      live "/users/log_in", UserLoginLive, :new
      live "/users/reset_password", UserForgotPasswordLive, :new
      live "/users/reset_password/:token", UserResetPasswordLive, :edit
    end

    post "/users/log_in", UserSessionController, :create
  end

  scope "/", DatumWeb do
    pipe_through [:browser, :require_authenticated_user]

    live_session :require_authenticated_user,
      on_mount: [{DatumWeb.UserAuth, :ensure_authenticated}] do
      live "/users/settings", UserSettingsLive, :edit
      live "/users/settings/confirm_email/:token", UserSettingsLive, :confirm_email

      # The HomeLive  is the root of the entire Datum project. Most other interactions with the application
      # happen at this level, within enclosed "tabs". Each "tab" is a separate LiveView process, which while
      # great for process isolation, can make it difficult to follow some patterns seen in other applications
      #
      # The HomeLive view's handle_params/3 function will propagate all patchs downwards to the enclosed tab
      # IF a parameter is provided called :tab_id and that tab is available to send messages to. This method
      # allows us to use patches and avoid full re-renders of the screen without having to do a lot of Javascrip
      # magic at each LiveView
      #
      # Note: tab LiveViews cannnot use the handle_params/3 callback - instead use the handle_cast/3 callback
      # see OriginExplorerLive for a sample
      live "/", HomeLive, :index

      # note how we preface the patch calls with the type of tab that should be handling it - helps keep this understandable
      live "/origin_explorer/:tab_id", HomeLive, :origin_explorer_index
      live "/origin_explorer/:tab_id/connect", HomeLive, :origin_explorer_connect
      live "/origin_explorer/:tab_id/:origin_id/delete", HomeLive, :origin_explorer_delete
    end
  end

  scope "/", DatumWeb do
    pipe_through [:browser]

    delete "/users/log_out", UserSessionController, :delete

    live_session :current_user,
      on_mount: [{DatumWeb.UserAuth, :mount_current_user}] do
      live "/users/confirm/:token", UserConfirmationLive, :edit
      live "/users/confirm", UserConfirmationInstructionsLive, :new

      live "/wiki", WikiLive, :home
      live "/wiki/:page", WikiLive, :page
    end
  end
end
