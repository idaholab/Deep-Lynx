import {QueueFactory} from '../services/queue/queue';
import Config from '../services/config';
import Cache from '../services/cache/cache';
import Logger from '../services/logger';
import {Writable} from 'stream';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import DataSourceRepository from '../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import {parentPort} from 'worker_threads';

process.setMaxListeners(100);
void PostgresAdapter.Instance.init()
    .then(() => {
        const dataSourceRepo = new DataSourceRepository();

        void QueueFactory()
            .then((queue) => {
                const destination = new Writable({
                    objectMode: true,
                    write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
                        dataSourceRepo
                            .findByID(chunk as string)
                            .then((source) => {
                                if (source.isError) {
                                    Logger.error(`unable to fetch data source ${source.error?.error}`);
                                    callback();
                                    return;
                                }
                                source.value
                                    .Run()
                                    .then(() => {
                                        callback();
                                    })
                                    .catch((e) => {
                                        Logger.error(`unable to process event from queue ${e}`);
                                        callback();
                                    })
                                    .finally(() => void Cache.set(`data_sources_queue_${chunk}`, {}, 30));
                            })
                            .catch((e) => {
                                Logger.error(`unable to process event from queue ${e}`);
                                callback();
                            });

                        return true;
                    },
                });

                destination.on('error', (e: Error) => {
                    void PostgresAdapter.Instance.close();

                    Logger.error(`unexpected error in data source queue thread ${e}`);
                    if (parentPort) parentPort.postMessage('done');
                    else {
                        process.exit(1);
                    }
                });

                queue.Consume(Config.data_sources_queue, destination);
            })
            .catch((e) => {
                void PostgresAdapter.Instance.close();

                Logger.error(`unexpected error in data source queue thread ${e}`);
                if (parentPort) parentPort.postMessage('done');
                else {
                    process.exit(1);
                }
            });
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in data source queue thread ${e}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });
