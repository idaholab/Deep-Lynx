// we've created a standalone loop for the Event System so as to maximize
// system resources. The main loop of Deep Lynx will spawn this process

import {Storage} from "./boot_storage";
import {StartQueue} from "./services/event_system/events";

const storage = new Storage()

storage.boot()
    .then(() => {
        StartQueue();
    })
