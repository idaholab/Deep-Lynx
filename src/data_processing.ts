// we've created a standalone loop for the Data Processing Loop so as to maximize
// system resources. The main loop of Deep Lynx will spawn this process

import {Storage} from "./boot_storage";
import {StartDataProcessing} from "./data_warehouse/etl/processing";

const storage = new Storage();

storage.boot()
    .then(() => {
        StartDataProcessing()
    })

