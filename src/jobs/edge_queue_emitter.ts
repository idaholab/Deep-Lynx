/*
  Standalone loop for emitting edge queue item records for processing.
 */

import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import {QueueFactory} from '../services/queue/queue';
import QueryStream from 'pg-query-stream';
import Logger from '../services/logger';
import Cache from '../services/cache/cache';
import Config from '../services/config';
import {plainToClass} from 'class-transformer';
import {parentPort} from 'worker_threads';
import EdgeQueueItemMapper from '../data_access_layer/mappers/data_warehouse/data/edge_queue_item_mapper';
import {EdgeQueueItem} from '../domain_objects/data_warehouse/data/edge';
const devnull = require('dev-null');
process.setMaxListeners(0);

const postgresAdapter = PostgresAdapter.Instance;
const mapper = EdgeQueueItemMapper.Instance;

void postgresAdapter
    .init()
    .then(() => {
        QueueFactory()
            .then((queue) => {
                const emitter = () => {
                    void postgresAdapter.Pool.connect((err, client, done) => {
                        const stream = client.query(new QueryStream(mapper.needRetriedStreamingStatement()));
                        const putPromises: Promise<boolean>[] = [];

                        stream.on('data', (data) => {
                            const item = plainToClass(EdgeQueueItem, data as object);

                            // check to see if the edge queue item is in the cache, indicating that there is a high probability that
                            // this message is already in the queue and either is being processed or waiting to be processed
                            Cache.get(`edge_insertion_${item.id}`)
                                .then((set) => {
                                    if (!set) {
                                        // if the item isn't the cache, we can go ahead and queue data
                                        putPromises.push(queue.Put(Config.edge_insertion_queue, item));
                                    }
                                })
                                // if we error out we need to go ahead and queue this message anyway, just so we're not dropping
                                // data
                                .catch((e) => {
                                    Logger.error(`error reading from cache for staging emitter ${e}`);
                                    putPromises.push(queue.Put(Config.edge_insertion_queue, item));
                                })
                                .finally(() => {
                                    void Cache.set(`edge_insertion_${item.id}`, {}, Config.initial_import_cache_ttl);
                                });
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

                            Promise.all(putPromises).finally(() => setTimeout(() => emitter(), 5000));
                        });

                        // we pipe to devnull because we need to trigger the stream and don't
                        // care where the data ultimately ends up
                        stream.pipe(devnull({objectMode: true}));
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
