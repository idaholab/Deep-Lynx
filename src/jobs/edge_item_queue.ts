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
import {parentPort} from 'worker_threads';
import {plainToClass} from 'class-transformer';
import {EdgeQueueItem} from '../domain_objects/data_warehouse/data/edge';
import {InsertEdge} from '../data_processing/edge_inserter';
import Cache from '../services/cache/cache';
import BackedLogger from '../services/logger';

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

process.on('unhandledRejection', (reason, promise) => {
    BackedLogger.error(`Unhandled rejection at ${promise} reason: ${reason}`);
    process.exit(1);
});

void PostgresAdapter.Instance.init()
    .then(() => {
        void QueueFactory()
            .then((queue) => {
                const destination = new Writable({
                    objectMode: true,
                    write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
                        const item = plainToClass(EdgeQueueItem, chunk as object);
                        InsertEdge(item)
                            .then((result) => {
                                if (result.isError) {
                                    Logger.error(`edge insertion error: ${result.error?.error}`);
                                }
                                callback();
                            })
                            .catch((e) => {
                                Logger.error(`unable to insert edge from queue ${e}`);
                                callback();
                            });

                        return true;
                    },
                });

                destination.on('error', (e: Error) => {
                    void PostgresAdapter.Instance.close();

                    Logger.error(`unexpected error in edge item queue thread ${e}`);
                    if (parentPort) parentPort.postMessage('done');
                    else {
                        process.exit(1);
                    }
                });

                queue.Consume(Config.edge_insertion_queue, destination);
            })
            .catch((e) => {
                void PostgresAdapter.Instance.close();

                Logger.error(`unexpected error in edge item queue thread ${e}`);
                if (parentPort) parentPort.postMessage('done');
                else {
                    process.exit(1);
                }
            });
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in edge item queue thread ${e}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });