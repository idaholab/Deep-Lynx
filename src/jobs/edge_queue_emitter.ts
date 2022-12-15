/*
  Standalone loop for emitting edge queue item records for processing.
 */

import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import {QueueFactory} from '../services/queue/queue';
import QueryStream from 'pg-query-stream';
import Logger from '../services/logger';
import Cache from '../services/cache/cache';
import Config from '../services/config';
import {instanceToPlain, plainToInstance} from 'class-transformer';
import {parentPort} from 'worker_threads';
import EdgeQueueItemMapper from '../data_access_layer/mappers/data_warehouse/data/edge_queue_item_mapper';
import {EdgeQueueItem} from '../domain_objects/data_warehouse/data/edge';
const devnull = require('dev-null');
process.setMaxListeners(0);

const postgresAdapter = PostgresAdapter.Instance;
const mapper = EdgeQueueItemMapper.Instance;

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

void postgresAdapter
    .init()
    .then(() => {
        QueueFactory()
            .then((queue) => {
                const emitter = () => {
                    void postgresAdapter.Pool.connect((err, client, done) => {
                        if (typeof err !== 'undefined') {
                            Logger.error(JSON.stringify(err));
                            done();
                            return;
                        }

                        const stream = client.query(new QueryStream(mapper.needRetriedStreamingStatement()));

                        stream.on('data', (data) => {
                            const item = plainToInstance(EdgeQueueItem, data as object);

                            // if the item isn't the cache, we can go ahead and queue data
                            queue.Put(Config.edge_insertion_queue, instanceToPlain(item)).catch((e) => {
                                Logger.error(`error reading from cache for staging emitter ${e}`);
                            });

                            // immediately set the next attempt time, this is how we handle back-pressuring for edge
                            // queue items
                            const currentTime = new Date().getTime();
                            const check = currentTime + Math.pow(Config.edge_insertion_backoff_multiplier, item.attempts++) * 1000;

                            item.next_attempt_at = new Date(check);

                            void EdgeQueueItemMapper.Instance.SetNextAttemptAt(item.id!, item.next_attempt_at.toISOString());
                        });

                        stream.on('error', (e: Error) => {
                            Logger.error(`unexpected error in edge queue item emitter emitter thread ${e}`);
                            if (parentPort) parentPort.postMessage('done');
                            else {
                                process.exit(0);
                            }
                        });

                        stream.on('end', () => {
                            done();
                        });

                        // we pipe to devnull because we need to trigger the stream and don't
                        // care where the data ultimately ends up
                        stream.pipe(devnull({objectMode: true}));

                        setTimeout(() => {
                            if (parentPort) parentPort.postMessage('done');
                            else {
                                process.exit(0);
                            }
                        }, 10000);
                    });
                };

                emitter();
            })
            .catch((e) => {
                void PostgresAdapter.Instance.close();

                Logger.error(`unable to initiate edge queue emitter: ${e}`);
                if (parentPort) parentPort.postMessage('done');
                else {
                    process.exit(1);
                }
            });
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in edge queue emitter thread ${e}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });
