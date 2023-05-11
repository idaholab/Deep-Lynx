/* eslint-disable @typescript-eslint/no-floating-promises,@typescript-eslint/no-misused-promises */
/*
    This job will refresh the materialized view containing metatype keys
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

                Logger.error(`unable to run refresh metatype keys view job ${e}`);
                process.exit(1);
            });
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in metatype keys view refresh thread ${e}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });
