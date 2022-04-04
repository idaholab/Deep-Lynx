/* eslint-disable @typescript-eslint/no-floating-promises,@typescript-eslint/no-misused-promises */
/*
    This job will delete all data in data_staging older than it's data source's data retention policy
 */
import Logger from '../services/logger';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import {parentPort} from 'worker_threads';
import DataStagingMapper from '../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';

const postgresAdapter = PostgresAdapter.Instance;

void postgresAdapter.init().then(() => {
    DataStagingMapper.Instance.DeleteOlderThanRetention()
        .then(() => {
            DataStagingMapper.Instance.Vacuum()
                .then(() => {
                    if (parentPort) parentPort.postMessage('done');
                    else {
                        process.exit(0);
                    }
                })
                .catch((e) => {
                    Logger.error(`unable to run staging cleaning job ${e}`);
                    process.exit(1);
                });
        })
        .catch((e) => {
            Logger.error(`unable to run staging cleaning job ${e}`);
            process.exit(1);
        });
});
