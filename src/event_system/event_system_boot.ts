// we've created a standalone loop for the Event System so as to maximize
// system resources. The main loop of Deep Lynx will spawn this process
import {StartQueue} from "./processor";
import PostgresAdapter from "../data_access_layer/mappers/db_adapters/postgres/postgres";

const postgresAdapter = PostgresAdapter.Instance

postgresAdapter.init()
    .then(() => {
        StartQueue();
    })
