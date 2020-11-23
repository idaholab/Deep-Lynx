// we've created a standalone loop for the Data Export Loop so as to maximize
// system resources. The main loop of Deep Lynx will spawn this process

import {Storage} from "./boot_storage";
import {RestartExports} from "./data_exporting/exporter";

const storage = new Storage()

storage.boot()
    .then(() => {
        RestartExports();
    })
