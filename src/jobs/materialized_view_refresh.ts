/* eslint-disable @typescript-eslint/no-floating-promises,@typescript-eslint/no-misused-promises */
/*
    This job will delete all data in data_staging older than it's data source's data retention policy
 */
import Logger from '../services/logger';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import {parentPort} from 'worker_threads';
import MetatypeKeyMapper from '../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';

const postgresAdapter = PostgresAdapter.Instance;

void postgresAdapter
    .init()
    .then(() => {
        MetatypeKeyMapper.Instance.RefreshView()
            .then(() => {
                void PostgresAdapter.Instance.close();

                if (parentPort) parentPort.postMessage('done');
                else {
                    process.exit(0);
                }
            })
            .catch((e) => {
                void PostgresAdapter.Instance.close();

                Logger.error(`unable to run refresh materialized view job ${e}`);
                process.exit(1);
            });
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in materialized view refresh thread ${e}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });
