// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
// Establish Phoenix Socket and LiveView configuration.
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "../vendor/topbar";

let Hooks = {};

Hooks.DraggableTab = {
  mounted() {
    let tab_id = this.el.dataset.tab;
    let group_index = this.el.dataset.group;
    this.el.addEventListener("dragstart", (e) => {
      console.log(tab_id);
      e.dataTransfer.setData("tab", tab_id);
      e.dataTransfer.setData("group", group_index);
    });
  },
};

Hooks.DraggableDropZone = {
  mounted() {
    let target_group_index = this.el.dataset.group;
    this.el.addEventListener("drop", (e) => {
      let tab_id = e.dataTransfer.getData("tab");
      let group_index = e.dataTransfer.getData("group");

      this.pushEvent("tab_dropped", {
        tab: tab_id,
        target_group_index: target_group_index,
      });
    });
  },
};

let csrfToken = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute("content");
let liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: { _csrf_token: csrfToken },
  hooks: Hooks,
  metadata: {
    keydown: (event, element) => {
      return {
        ctrlKey: event.ctrlKey,
      };
    },
  },
});

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
window.addEventListener("phx:page-loading-start", (_info) => topbar.show(300));
window.addEventListener("phx:page-loading-stop", (_info) => topbar.hide());

// connect if there are any LiveViews on the page
liveSocket.connect();

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket;
