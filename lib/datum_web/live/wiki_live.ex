defmodule DatumWeb.WikiLive do
  @moduledoc """
  This is the live view for rendering the internal Wiki. The wiki lives in /priv/wiki.
  The wiki requires a `home.md` and `table_of_contents.md` to function correctly. Pages
  are rendered by treating the url after `wiki/` as a param representing the wiki pages
  file name. So in order to work, you must have a wiki page who's file name is URL formatted.
  """
  use DatumWeb, :live_view

  @impl true
  def render(assigns) do
    ~H"""
    <div class="flex">
      <div class="flex-auto w-6"></div>
      <div class="flex-auto w-64 ">
        <article class="prose">
          <div :if={@content}><%= @content |> raw() %></div>
        </article>
      </div>
      <div class="flex-auto w-10 justify-items-end">
        <ul class="menu bg-base-200 rounded-box w-56 mt-10">
          <%= @toc |> raw() %>
        </ul>
      </div>
    </div>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:content, nil)
     |> assign(
       :toc,
       Earmark.as_html!(
         File.read!(
           Path.join(
             Application.app_dir(:datum),
             "priv/wiki/table_of_contents.md"
           )
         )
       )
     )}
  end

  @impl true
  def handle_params(params, _uri, socket) do
    page = Map.get(params, "page")

    if page do
      path =
        Path.join(
          Application.app_dir(:datum),
          "priv/wiki/#{Map.get(params, "page", "not_found")}.md"
        )

      if File.exists?(path) do
        {:noreply, socket |> assign(:content, Earmark.as_html!(File.read!(path)))}
      else
        {:noreply,
         socket |> put_flash(:error, "Unable to render wiki page.") |> push_patch(to: ~p"/wiki")}
      end
    else
      path =
        Path.join(
          Application.app_dir(:datum),
          "priv/wiki/home.md"
        )

      if File.exists?(path) do
        {:noreply, socket |> assign(:content, Earmark.as_html!(File.read!(path)))}
      else
        {:noreply,
         socket |> put_flash(:error, "Unable to render wiki page.") |> push_patch(to: ~p"/wiki")}
      end
    end
  end
end
