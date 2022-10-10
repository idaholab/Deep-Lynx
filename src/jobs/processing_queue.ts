/*
    This starts a never-ending loop of consuming data processing messages from the queue.
    Each of those messages consists of a data staging record id which is then fetched and
    sent to be be processed.
 */
import {QueueFactory} from '../services/queue/queue';
import Config from '../services/config';
import Logger from '../services/logger';
import {Writable} from 'stream';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import {ProcessData} from '../data_processing/process';
import {parentPort} from 'worker_threads';
import {plainToInstance} from 'class-transformer';
import {DataStaging} from '../domain_objects/data_warehouse/import/import';
import Cache from '../services/cache/cache';

// handle cache clears from parent IF memory cache
if (Config.cache_provider === 'memory') {
    parentPort?.on('message', (message: any) => {
        const parts = message.split('|');
        // if a two part message it's a deleted key
        if (parts.length === 2 && parts[0] === 'deleted') {
            void Cache.del(parts[1]);
        }

        if (parts.length === 1 && parts[0] === 'flush') {
            void Cache.flush();
        }
    });
}

void PostgresAdapter.Instance.init()
    .then(() => {
        void QueueFactory()
            .then((queue) => {
                const destination = new Writable({
                    objectMode: true,
                    write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
                        const stagingRecord = plainToInstance(DataStaging, chunk as object);
                        ProcessData(stagingRecord)
                            .then((result) => {
                                if (result.isError) {
                                    Logger.error(`processing error: ${result.error?.error}`);
                                }
                                callback();
                            })
                            .catch((e) => {
                                Logger.error(`unable to process data from queue ${e}`);
                                callback();
                            });

                        return true;
                    },
                });

                destination.on('error', (e: Error) => {
                    void PostgresAdapter.Instance.close();

                    Logger.error(`unexpected error in processing queue thread ${e}`);
                    if (parentPort) parentPort.postMessage('done');
                    else {
                        process.exit(1);
                    }
                });

                queue.Consume(Config.process_queue, destination);
            })
            .catch((e) => {
                void PostgresAdapter.Instance.close();

                Logger.error(`unexpected error in processing queue thread ${e}`);
                if (parentPort) parentPort.postMessage('done');
                else {
                    process.exit(1);
                }
            });
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in processing queue thread ${e}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });
