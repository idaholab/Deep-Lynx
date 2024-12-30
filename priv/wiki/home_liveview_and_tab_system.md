# Home LiveView and Tab System

_This article describes the primary LiveView - `DatumWeb.HomeLive` - and its tab system._

### Required Reading/Knowledge

- [LiveView lifecycle](https://hexdocs.pm/phoenix_live_view/1.0.0/Phoenix.LiveView.html#module-life-cycle): needed to understand the various callbacks, like `handle_event/3`, `handle_params/3` etc
- [Phoenix.Component.live_render/3](https://hexdocs.pm/phoenix_live_view/1.0.0/Phoenix.Component.html#live_render/3): needed to understand how nested LiveViews work and how we sticky them across the session


## The Players

### `DatumWeb.HomeLive`

This is primary player in the orchestra that is the window pane and tab system. It is loaded at the router level and contains visual logic for managing a set of windowed containers dynamically. 

The view relies on a user being logged in correctly, and on the `Datum.Accounts.User` struct having a field storing a list of the following struct - `Datum.Common.ExplorerTabs`. 


### `Datum.Common.ExplorerTabs`

This struct represents a visual tab that can be displayed and manipulated by the user. One of the required fields is `:module` - this represents a `DatumWeb` module. **The module must be a LiveView!**

The tab, when rendered, will find the supplied module and supply any saved state to that module on its initialization. Remember that LiveViews *are processes* - so they can receive and send messages and handle their own, internal state. 

While `HomeLive` is in charge of hydrating the tab with its initial state, the tab's module is in charge of any updating of said state **and saving it to the `Common.ExplorerTabs` struct on the User in the database**.


## Communication

Like all Elixir/Erlang - we handle communication between tabs and `HomeLive` via message passing. Earlier we noted that each LiveView was its own process - because that is case, we can easily communicate between tabs and home view by calling sending messages to them either through `Kernel.send/2` or through `GenServer.call/3`/`GenServer.cast/2`.

When a new tab, a LiveView, is initialized and `mount/3` is called - you should search the parameters for the parent process ID - PID. You can see how this works in `DatumWeb.OriginExplorerLive`. When `HomeLive` renders the tab, it does so passing it's own process ID to it. This allows the tab to receive and record the parent process ID in order to send messages. Once you've recorded that process ID you can send messages to the `HomeLive` via the methods above. **Note: each distinct method of sending a message also has a distinct receiver method. Read the documentation to learn more.**

An example of how we use message passing is when the `DatumWeb.OriginExplorerLive` requests that the `HomeLive`, or home screen, opens a new `DatumWeb.GraphExplorerLive` tab with data it sends to visualize. The `HomeLive` module receives this message and opens a new tab with the requested data.


Tabs can't easily communicate with each other - unless they have the process ID of the tab they're hoping to respond to. It's easier then, to send a message from a tab to `HomeLive` with the tab's ID - and let `HomeLive` sort out what process ID matches that tab and then sending the requested message back down. It becomes a broker and we avoid any unforeseen side affects.


## Gotcha's

### **Cannot use `Phoenix.LiveView.handle_params/3` in tabs** 

Because this function relies on the LiveView calling it being mounted at the router, it will not work when in a nested LiveView. While you can still call `Phoenix.LiveView.push_patch/2` in a nested LiveView to trigger state update without re-rendering, that patch should be handled by `HomeLive` - and propagated downwards as a message.

**Solution**: You can call `Phoenix.LiveView.push_patch/3` at any point as long as you make sure the URL supplied is mounted like below on the router. The HomeLive module will propagate your patch and parameters downwards to the proper tab as a message.

```elixir
# The HomeLive view's handle_params/3 function will propagate all patches downwards to the enclosed tab
# IF a parameter is provided called :tab_id and that tab is available to send messages to. This method
# allows us to use patches and avoid full re-renders of the screen without having to do a lot of Javascrip
# magic at each LiveView
#
# note how we prefix the url prior to the tab_id with the type of module the tab is
live "/origin_explorer/:tab_id/patched_url/:patched_param", HomeLive, :origin_explorer_patch
```

