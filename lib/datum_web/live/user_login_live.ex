defmodule DatumWeb.UserLoginLive do
  use DatumWeb, :live_view
  use Gettext, backend: DatumWeb.Gettext

  def render(assigns) do
    ~H"""
    <div class="mx-auto max-w-sm">
      <div class="card p-4 text-primary-content w-96 shadow-xl">
        <.header class="text-center text-white">
          Log in to account
          <:subtitle>
            Don't have an account?
            <.link navigate={~p"/users/register"} class="font-semibold text-brand hover:underline">
              {gettext("Sign up")}
            </.link>
            for an account now.
          </:subtitle>
        </.header>

        <.simple_form
          for={@form}
          id="login_form"
          action={~p"/users/log_in"}
          phx-update="ignore"
          class="mt-6"
        >
          <div class="pb-4">
            <.input field={@form[:email]} type="email" label="Email" required />
            <div class="pt-4"></div>
            <.input field={@form[:password]} type="password" label="Password" required />
          </div>
          <:actions>
            <.input field={@form[:remember_me]} type="checkbox" label="Keep me logged in" />
            <.link href={~p"/users/reset_password"} class="text-sm text-white font-semibold">
              Forgot your password?
            </.link>
          </:actions>
          <:actions>
            <.button phx-disable-with="Logging in..." class="w-full mt-4">
              Log in <span aria-hidden="true">→</span>
            </.button>
          </:actions>
        </.simple_form>
      </div>
    </div>
    """
  end

  def mount(_params, _session, socket) do
    email = Phoenix.Flash.get(socket.assigns.flash, :email)
    form = to_form(%{"email" => email}, as: "user")
    {:ok, assign(socket, form: form), temporary_assigns: [form: form]}
  end
end
