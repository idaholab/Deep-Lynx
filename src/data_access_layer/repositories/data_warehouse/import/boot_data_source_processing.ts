/* eslint-disable @typescript-eslint/no-floating-promises,@typescript-eslint/no-misused-promises */
/*
 Standalone loop for the Data Source Process Loop so as to maximize system resources.
 The main loop of Deep Lynx will spawn this process. This process should restart
 any data sources that were in the process of running when Deep Lynx shut down. The actual
 implementation of the data source uses database locks to insure that you can run
 as many instances of this process as you'd like and not have data duplication issues
*/
import Logger from '../../../../services/logger';
import DataSourceRepository from './data_source_repository';
import PostgresAdapter from '../../../mappers/db_adapters/postgres/postgres';

const postgresAdapter = PostgresAdapter.Instance;

postgresAdapter.init().then(() => {
    const repo = new DataSourceRepository();

    repo.where()
        .active()
        .list()
        .then((results) => {
            if (results.isError) {
                Logger.error(`unable to restart active data source's process loop ${results.error?.error}`);
                return;
            }

            results.value.forEach((dataSource) => dataSource?.Process());
        })
        .catch((err) => Logger.error(`unable to restart active data source's process loop ${err}`));
});
