// we've created a standalone loop for the Data Polling Loop so as to maximize
// system resources. The main loop of Deep Lynx will spawn this process

import {Storage} from "./boot_storage";
import {StartDataSourcePolling} from "./data_warehouse/import/data_source";

const storage = new Storage()

storage.boot()
    .then(() => {
        StartDataSourcePolling();
    })
