/*
 Standalone loop for the Data Export Loop so as to maximize system resources.
 The main loop of Deep Lynx will spawn this process. This process should restart
 any exports that were in the process of running when Deep Lynx shut down. The actual
 implementation of the exporter uses database locks to insure that you can run
 as many instances of this process as you'd like and not have data duplication issues
*/
import Logger from '../services/logger';
import ExporterRepository from '../data_access_layer/repositories/data_warehouse/export/export_repository';
import {SuperUser} from '../access_management/user';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import PQueue from 'p-queue';
import {parentPort} from 'worker_threads';
import Config from '../services/config';

const postgresAdapter = PostgresAdapter.Instance;

void postgresAdapter.init().then(() => {
    const exporterRepo = new ExporterRepository();
    Logger.debug('starting export processing job');

    const queue = new PQueue({concurrency: Config.export_data_concurrency});

    exporterRepo
        .where()
        .status('eq', 'processing')
        .list()
        .then((exporters) => {
            if (exporters.isError) Logger.error(`unable to list exporters ${exporters.error?.error}`);

            const tasks = [];

            for (const exporter of exporters.value) {
                if (exporter) {
                    tasks.push(queue.add(() => exporter?.Restart(SuperUser)));
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
                    Logger.error(`unable to process exports ${e}`);
                    process.exit(1);
                });
        })
        .catch((e) => Logger.error(`unable to restart exports ${e}`));
});
