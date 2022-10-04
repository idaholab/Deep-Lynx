import Logger from '../services/logger';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import {parentPort, workerData} from 'worker_threads';
import GraphQLRunner from './schema';

const runner = new GraphQLRunner();

void PostgresAdapter.Instance.init()
    .then(() => {
        runner
            .RunQuery(workerData.containerID, workerData.query, workerData.options)
            .then((result: any) => {
                parentPort?.postMessage(JSON.stringify(result));
            })
            .catch((e) => {
                Logger.error(`unexpected error in graphql processing thread ${e}`);
            })
            .finally(() => process.exit(0));
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in processing queue thread ${e}`);
        process.exit(1);
    });
