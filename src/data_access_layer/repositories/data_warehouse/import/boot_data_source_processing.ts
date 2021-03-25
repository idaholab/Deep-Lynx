// we've created a standalone loop for the Data Processing Loop so as to maximize
// system resources. The main loop of Deep Lynx will spawn this process
import Logger from "../../../../services/logger"
import DataSourceRepository from "./data_source_repository";
import PostgresAdapter from "../../../mappers/db_adapters/postgres/postgres";

const postgresAdapter = PostgresAdapter.Instance

postgresAdapter.init()
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

