// we've created a standalone loop for the Data Polling Loop so as to maximize
// system resources. The main loop of Deep Lyn will spawn this process

import {Storage} from "./boot_storage";
import {StartDataSourcePolling} from "./data_importing/data_source";

const storage = new Storage()

storage.boot()
    .then(() => {
        StartDataSourcePolling();
    })
