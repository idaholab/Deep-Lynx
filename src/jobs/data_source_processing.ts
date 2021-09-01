/* eslint-disable @typescript-eslint/no-floating-promises,@typescript-eslint/no-misused-promises */
/*
 Standalone loop for the Data Source Process Loop so as to maximize system resources.
 The main loop of Deep Lynx will spawn this process. This process should restart
 any data sources that were in the process of running when Deep Lynx shut down. The actual
 implementation of the data source uses database locks to insure that you can run
 as many instances of this process as you'd like and not have data duplication issues
*/
import Logger from '../services/logger';
import DataSourceRepository from '../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import PQueue from 'p-queue';
import {parentPort} from 'worker_threads';
import Config from '../services/config';

const postgresAdapter = PostgresAdapter.Instance;

void postgresAdapter.init().then(() => {
    Logger.debug('starting data processing job');
    const repo = new DataSourceRepository();

    const queue = new PQueue({concurrency: Config.data_source_concurrency});

    repo.where()
        .active()
        .list()
        .then((results) => {
            if (results.isError) {
                Logger.error(`unable to restart active data source's process loop ${results.error?.error}`);
                return;
            }

            const tasks = [];

            for (const source of results.value) {
                if (source) {
                    tasks.push(queue.add(() => source.Process()));
                }
            }

            Promise.all(tasks)
                .then(() => {
                    if (parentPort) parentPort.postMessage('done');
                    else {
                        process.exit(0);
                    }
                })
                .catch((e) => {
                    Logger.error(`unable to process data sources ${e}`);
                    process.exit(1);
                });
        })
        .catch((err) => {
            Logger.error(`unable to restart active data source's process loop ${err}`);
            process.exit(1);
        });
});
