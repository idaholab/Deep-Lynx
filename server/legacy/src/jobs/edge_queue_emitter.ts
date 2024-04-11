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
import BackedLogger from '../services/logger';
import {Transform, TransformCallback} from 'stream';
const devnull = require('dev-null');
process.setMaxListeners(0);

const postgresAdapter = PostgresAdapter.Instance;
const mapper = EdgeQueueItemMapper.Instance;

process.on('unhandledRejection', (reason, promise) => {
    BackedLogger.error(`Unhandled rejection at ${promise} reason: ${reason}`);
    process.exit(1);
});

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
                    return new Promise<void>((resolve) => {
                        void postgresAdapter.Pool.connect((err, client, done) => {
                            if (typeof err !== 'undefined') {
                                Logger.error(JSON.stringify(err));
                                done();

                                Logger.error(`unexpected error in edge queue item emitter emitter thread ${JSON.stringify(err)}`);
                                if (parentPort) parentPort.postMessage('done');
                                else {
                                    process.exit(0);
                                }
                                return;
                            }

                            const stream = client.query(new QueryStream(mapper.needRetriedStreamingStatement()));

                            class transform extends Transform {
                                public putPromises: Promise<boolean>[] = [];
                                constructor() {
                                    super({
                                        objectMode: true,
                                        transform: (data: any, encoding: BufferEncoding, callback: TransformCallback) => {
                                            const item = plainToInstance(EdgeQueueItem, data as object);

                                            // if the item isn't the cache, we can go ahead and queue data
                                            this.putPromises.push(queue.Put(Config.edge_insertion_queue, instanceToPlain(item)));

                                            // immediately set the next attempt time, this is how we handle back-pressuring for edge
                                            // queue items
                                            const currentTime = new Date().getTime();
                                            const check = currentTime + Math.pow(Config.edge_insertion_backoff_multiplier, item.attempts++) * 1000;

                                            item.next_attempt_at = new Date(check);

                                            void EdgeQueueItemMapper.Instance.SetNextAttemptAt(item.id!, item.next_attempt_at.toISOString());

                                            // if the promises length is too great, resolve the promises before we continue the stream
                                            if (this.putPromises.length > 500) {
                                                const buffer = [...this.putPromises];
                                                this.putPromises = [];
                                                void Promise.all(buffer)
                                                    .catch((e) => {
                                                        Logger.error(`error while awaiting put promises in edge queue emitter ${JSON.stringify(e)}`);
                                                        callback(e, null);
                                                    })
                                                    .finally(() => {
                                                        callback(null, item);
                                                    });
                                            } else {
                                                callback(null, item);
                                            }
                                        },
                                    });
                                }
                            }

                            const emitterStream = new transform();

                            // we have to handle the leftover buffer
                            emitterStream.on('end', () => {
                                if (emitterStream.putPromises.length > 0) {
                                    const buffer = [...emitterStream.putPromises];
                                    emitterStream.putPromises = [];
                                    void Promise.all(buffer)
                                        .catch((e) => {
                                            Logger.error(`error while awaiting put promises in edge queue emitter ${JSON.stringify(e)}`);
                                            if (parentPort) parentPort.postMessage('done');
                                            else {
                                                process.exit(1);
                                            }
                                        })
                                        .finally(() => {
                                            done();
                                            resolve();
                                        });
                                } else {
                                    done();
                                    resolve();
                                }
                            });

                            emitterStream.on('error', (e: Error) => {
                                Logger.error(`unexpected error in edge queue item emitter emitter thread ${JSON.stringify(e)}`);
                                if (parentPort) parentPort.postMessage('done');
                                else {
                                    process.exit(1);
                                }
                            });

                            stream.on('error', (e: Error) => {
                                Logger.error(`unexpected error in edge queue item emitter emitter thread ${JSON.stringify(e)}`);
                                if (parentPort) parentPort.postMessage('done');
                                else {
                                    process.exit(1);
                                }
                            });

                            // we pipe to devnull because we need to trigger the stream and don't
                            // care where the data ultimately ends up
                            stream.pipe(emitterStream).pipe(devnull({objectMode: true}));
                        });
                    });
                };

                emitter()
                    .catch((e) => {
                        void PostgresAdapter.Instance.close();

                        Logger.error(`error in edge queue emitter: ${JSON.stringify(e)}`);
                        if (parentPort) parentPort.postMessage('done');
                        else {
                            process.exit(1);
                        }
                    })
                    .finally(() => {
                        if (parentPort) parentPort.postMessage('done');
                        else {
                            process.exit(0);
                        }
                    });
            })
            .catch((e) => {
                void PostgresAdapter.Instance.close();

                Logger.error(`unable to initiate edge queue emitter: ${JSON.stringify(e)}`);
                if (parentPort) parentPort.postMessage('done');
                else {
                    process.exit(1);
                }
            });
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in edge queue emitter thread ${JSON.stringify(e)}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });
