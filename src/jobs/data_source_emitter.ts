/*
  Standalone loop for emitting data source run events. These are emitted every
  minute for each data source, a separate processing thread will take care of
  the messages from the queue
 */

import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import {QueueFactory} from '../services/queue/queue';
import DataSourceMapper from '../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import QueryStream from 'pg-query-stream';
import Logger from '../services/logger';
import Cache from '../services/cache/cache';
import Config from '../services/config';
import {parentPort} from 'worker_threads';
import {plainToClass} from 'class-transformer';
import DataSourceRecord from '../domain_objects/data_warehouse/import/data_source';
import { Transform, TransformCallback } from 'stream';
const devnull = require('dev-null');
process.setMaxListeners(0);

const postgresAdapter = PostgresAdapter.Instance;
const dataSourceMapper = DataSourceMapper.Instance;

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
                        postgresAdapter.Pool.connect((err, client, done) => {
                            const stream = client.query(new QueryStream(dataSourceMapper.listAllActiveStatement()));
                            
                            class transform extends Transform {
                                public putPromises: Promise<boolean>[] = [];

                                constructor() {
                                    super({
                                        objectMode: true,
                                        transform: (data: any, encoding: BufferEncoding, callback: TransformCallback) => {
                                            const sourceID = plainToClass(DataSourceRecord, data as object).id;

                                            // check to see if the data source ID is in the cache, indicating that there is a high probability that
                                            // this message is already in the queue and is either being processed or waiting to be processed
                                            Cache.get(`data_sources_queue_${data.id}`)
                                                .then((set) => {
                                                    // if it isn't in the cache, we can add the source ID to the queue
                                                    this.putPromises.push(queue.Put(Config.data_sources_queue, sourceID));
                                                })
                                                // if we error out we need to queue this messazge anyway so we're not dropping data
                                                .catch((e) => {
                                                    Logger.error(`error reading from cache for data source emitter ${e}`);
                                                    this.putPromises.push(queue.Put(Config.data_sources_queue, sourceID));
                                                })
                                                .finally(() => {
                                                    if (sourceID) {
                                                        // we set the cache value
                                                        Cache.set(`data_sources_queue_${data.id}`, {}, 21600).catch((e) => {
                                                            Logger.error(
                                                                `unexpected error in data source emitter when attempting to put data source on cache ${e}`
                                                            );
                                                        });
                                                    }

                                                    // check the buffer, await if needed
                                                    if (this.putPromises.length > 500) {
                                                        const buffer = [...this.putPromises];
                                                        this.putPromises = [];
                                                        void Promise.all(buffer)
                                                            .catch((e) => {
                                                                Logger.error(`error while awaiting put promises in data source emitter ${JSON.stringify(e)}`);
                                                                callback(e, null);
                                                            })
                                                            .finally(() => {
                                                                callback(null, sourceID);
                                                            });
                                                    } else {
                                                        callback(null, sourceID);
                                                    }
                                                });
                                        },
                                    });
                                }
                            }

                            const emitterStream = new transform();

                            // we have to handle the leftover buffer (anything less than 500)
                            emitterStream.on('end', () => {
                                if (emitterStream.putPromises.length > 0) {
                                    const buffer = [...emitterStream.putPromises];
                                    emitterStream.putPromises = [];
                                    void Promise.all(buffer)
                                        .catch((e) => {
                                            Logger.error(`error awaiting put promises in data source emitter ${JSON.stringify(e)}`);
                                            if (parentPort) {
                                                parentPort.postMessage('done');
                                            } else {
                                                process.exit(1);
                                            }
                                        })
                                        .finally(() => {
                                            done();
                                            resolve();
                                        })
                                } else {
                                    done();
                                    resolve();
                                }
                            });

                            emitterStream.on('error', (e: Error) => {
                                Logger.error(`unexpected error in data source emitter thread ${JSON.stringify(e)}`);
                                if (parentPort) {
                                    parentPort.postMessage('done');
                                } else {
                                    process.exit(1);
                                }
                            });

                            stream.on('error', (e: Error) => {
                                Logger.error(`unexpected error in data source emitter thread ${JSON.stringify(e)}`);
                                if (parentPort) {
                                    parentPort.postMessage('done');
                                } else {
                                    process.exit(1);
                                }
                            });

                            // we pipe to devnull because we need to trigger the stream and
                            // don't care where the data ultimately ends up
                            stream.pipe(emitterStream).pipe(devnull({objectMode: true}));
                        });
                    });
                };

                emitter()
                    .catch((e) => {
                        void PostgresAdapter.Instance.close();

                        Logger.error(`error in data source emitter: ${JSON.stringify(e)}`);
                        if (parentPort) {
                            parentPort.postMessage('done');
                        } else {
                            process.exit(1);
                        }
                    })
                    .finally(() => {
                        if (parentPort) {
                            parentPort.postMessage('done');
                        } else {
                            process.exit(1);
                        }
                    });
            })
            .catch((e) => {
                void PostgresAdapter.Instance.close();

                Logger.error(`unable to initiate data source emitter: ${e}`);
                if (parentPort) {
                    parentPort.postMessage('done');
                } else {
                    process.exit(1);
                }
            });
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in data source emitter thread ${e}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });
