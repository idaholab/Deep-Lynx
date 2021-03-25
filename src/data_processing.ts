// we've created a standalone loop for the Data Processing Loop so as to maximize
// system resources. The main loop of Deep Lynx will spawn this process

import {Storage} from "./boot_storage";
import Logger from "./services/logger"
import DataSourceRepository from "./data_access_layer/repositories/data_warehouse/import/data_source_repository";

const storage = new Storage();

storage.boot()
    .then(() => {
        const repo = new DataSourceRepository()

        repo.where().active().list()
            .then(results => {
               if(results.isError) {
                   Logger.error(`unable to restart active data source's process loop ${results.error?.error}`)
                   return
               }

               results.value.forEach(dataSource => dataSource?.Process())
            })
            .catch(err => Logger.error(`unable to restart active data source's process loop ${err}`))
    })

