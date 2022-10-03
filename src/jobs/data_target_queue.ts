import {QueueFactory} from '../services/queue/queue';
import Config from '../services/config';
import Logger from '../services/logger';
import {Writable} from 'stream';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import DataTargetRepository from '../data_access_layer/repositories/data_warehouse/export/data_target_repository';
import {parentPort} from 'worker_threads';
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

void PostgresAdapter.Instance.init().then(() => {
    const dataTargetRepo = new DataTargetRepository();

    void QueueFactory().then((queue) => {
        const destination = new Writable({
            objectMode: true,
            write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
                dataTargetRepo
                    .findByID(chunk as string)
                    .then((target) => {
                        if (target.isError) {
                            Logger.error(`unable to fetch data target ${target.error?.error}`);
                            callback();
                            return;
                        }
                        target.value
                            .Run()
                            .then(() => {
                                callback();
                            })
                            .catch((e) => {
                                Logger.error(`unable to process event from queue ${e}`);
                                callback();
                            });
                    })
                    .catch((e) => {
                        Logger.error(`unable to process event from queue ${e}`);
                        callback();
                    });

                return true;
            },
        });

        queue.Consume(Config.data_targets_queue, destination);
    });
});
