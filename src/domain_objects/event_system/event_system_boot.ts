/*
 Standalone loop for the Data Source Process Loop so as to maximize system resources.
 The main loop of Deep Lynx will spawn this process. This process should restart
 the event management and processing system.
*/
import {StartQueue} from './processor';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';

const postgresAdapter = PostgresAdapter.Instance;

void postgresAdapter.init().then(() => {
    void StartQueue();
});
