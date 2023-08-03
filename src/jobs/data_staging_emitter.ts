/*
  Standalone loop for emitting data staging records for processing. Any data staging
  record with active mappings and transformations will be emitted in a stream to the
  queue.
 */

import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import {QueueFactory} from '../services/queue/queue';
import QueryStream from 'pg-query-stream';
import Logger from '../services/logger';
import Cache from '../services/cache/cache';
import Config from '../services/config';
import {plainToClass} from 'class-transformer';
import DataStagingMapper from '../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
import {DataStaging} from '../domain_objects/data_warehouse/import/import';
import {parentPort} from 'worker_threads';
import BackedLogger from '../services/logger';
import {Transform, TransformCallback} from 'stream';
const devnull = require('dev-null');
process.setMaxListeners(0);

const postgresAdapter = PostgresAdapter.Instance;
const dataStagingMapper = DataStagingMapper.Instance;

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

void postgresAdapter
    .init()
    .then(() => {
        QueueFactory()
            .then((queue) => {
                const emitter = () => {
                    return new Promise<void>((resolve) => {
                        postgresAdapter.Pool.connect((err, client, done) => {
                            const stream = client.query(new QueryStream(dataStagingMapper.listImportUninsertedActiveMappingStatement()));
                            const seenImports: Map<string, undefined> = new Map<string, undefined>();

                            class transform extends Transform {
                                public putPromises: Promise<boolean>[] = [];

                                constructor() {
                                    super({
                                        objectMode: true,
                                        transform: (data: any, encoding: BufferEncoding, callback: TransformCallback) => {
                                            const staging = plainToClass(DataStaging, data as object);

                                            // check to see if the importID is in the cache, indicating that there is a high probability that
                                            // this message is already in the queue and either is being processed or waiting to be processed
                                            Cache.get(`imports:${staging.import_id}`)
                                                .then((set) => {
                                                    // if it's set but in our list of seen imports then odds are we're the one putting this import
                                                    // in, so we need to handle that fact
                                                    if (!set || (set && seenImports.has(staging.import_id!))) {
                                                        // if the import isn't the cache, we can go ahead and queue the staging data
                                                        this.putPromises.push(queue.Put(Config.process_queue, staging));
                                                    }

                                                    //Only update the cache ttl if it wasn't found. 
                                                    if (!set)
                                                    {
                                                        Cache.set(`imports:${staging.import_id}`, {}, Config.initial_import_cache_ttl).catch((e) => {
                                                            Logger.error(
                                                                `unexpected error in data staging emitter when attempting to put import on cache ${e}`,
                                                            );
                                                        });
                                                    }
                                                })
                                                // if we error out we need to go ahead and queue this message anyway, just so we're not dropping
                                                // data
                                                .catch((e) => {
                                                    Logger.error(`error reading from cache for staging emitter ${e}`);
                                                    this.putPromises.push(queue.Put(Config.process_queue, staging));
                                                })
                                                .finally(() => {
                                                    if (staging.import_id) {
                                                        //push the imports into seen imports
                                                        seenImports.set(staging.import_id, undefined);
                                                    }

                                                    // check the buffer, await if needed
                                                    if (this.putPromises.length > 500) {
                                                        const buffer = [...this.putPromises];
                                                        this.putPromises = [];
                                                        void Promise.all(buffer)
                                                            .catch((e) => {
                                                                Logger.error(`error while awaiting put promises in data staging emitter ${JSON.stringify(e)}`);
                                                                callback(e, null);
                                                            })
                                                            .finally(() => {
                                                                callback(null, staging);
                                                            });
                                                    } else {
                                                        callback(null, staging);
                                                    }
                                                });
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
                                            Logger.error(`error while awaiting put promises in data staging emitter ${JSON.stringify(e)}`);
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
                                Logger.error(`unexpected error in data staging emitter emitter thread ${JSON.stringify(e)}`);
                                if (parentPort) parentPort.postMessage('done');
                                else {
                                    process.exit(1);
                                }
                            });

                            stream.on('error', (e: Error) => {
                                Logger.error(`unexpected error in data staging emitter emitter thread ${JSON.stringify(e)}`);
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

                        Logger.error(`error in data staging emitter: ${JSON.stringify(e)}`);
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

                Logger.error(`unable to initiate data source emitter: ${e}`);
                if (parentPort) parentPort.postMessage('done');
                else {
                    process.exit(1);
                }
            });
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in data staging emitter thread ${e}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });
