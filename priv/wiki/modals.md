# Modals
 
A modal is a user interface element that displays content in a layer above the main application window, typically to capture user input or display information without navigating away from the current page. 

#### LiveView Structure and Modal Integration
When using modals, it's common to send variables or data from the LiveView to the modal. The process involves updating the modal's content and triggering changes in the LiveView state when interacting with the modal.


#### Conditional Rendering

In a LiveView, a modal can be rendered conditionally based on the LiveView state. 

 ```
 <.modal :if={@live_action in [:example]}>
 ```
This involves checking if the @live_action assign has a specific value (e.g., :example). If the condition evaluates to true, the modal is rendered within the LiveView template. The @live_action assign is typically updated through events in the LiveView, such as when the user interacts with a button or a link. 

#### Sending Variables from Parent LiveView to Modal

The LiveView can send variables to the modal by directly passing them into the modal component through assigns. 

```
  {:ok,
    socket
    |> assign(:example_assign, example)
```
```
 <.live_component
    live_action={@live_action}
    module={DatumWeb.LiveComponent.Example}
    id="example_id"
    example={@example_assign}
    patch={~p"/example}"}
/>
```

The modal component receives the example_assign as an assign and renders it. 

#### Using patch for State Updates

In the event handler, the patch function can be used to update the browser's URL without a full page reload and trigger updates to the LiveView state. 

If you want to send updated data from the modal back to the LiveView, you can use phx-submit, phx-click, or other events to trigger updates. After processing, you can use patch to reflect the changes in the URL.

#### Summary

1. Parent LiveView passes data to the Live Component (modal) through assigns.
2. The Live Component (modal) receives the data during its mount phase and can use it in its render.
3. The Live Component can send events back to the parent to update the state, which might trigger a re-render of the modal with updated data.
