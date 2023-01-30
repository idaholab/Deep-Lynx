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
                    void postgresAdapter.Pool.connect((err, client, done) => {
                        const stream = client.query(new QueryStream(dataStagingMapper.listImportUninsertedActiveMappingStatement()));
                        const seenImports: Map<string, undefined> = new Map<string, undefined>();

                        stream.on('data', (data) => {
                            const staging = plainToClass(DataStaging, data as object);

                            // check to see if the importID is in the cache, indicating that there is a high probability that
                            // this message is already in the queue and either is being processed or waiting to be processed
                            Cache.get(`imports:${staging.import_id}`)
                                .then((set) => {
                                    // if it's set but in our list of seen imports then odds are we're the one putting this import
                                    // in, so we need to handle that fact
                                    if (!set || (set && seenImports.has(staging.import_id!))) {
                                        // if the import isn't the cache, we can go ahead and queue the staging data
                                        queue.Put(Config.process_queue, staging).catch((e) => {
                                            Logger.error(
                                                `unexpected error in data staging emitter emitter thread when attempting to put message on queue ${e}`,
                                            );
                                        });
                                    }
                                })
                                // if we error out we need to go ahead and queue this message anyway, just so we're not dropping
                                // data
                                .catch((e) => {
                                    Logger.error(`error reading from cache for staging emitter ${e}`);
                                    queue.Put(Config.process_queue, staging).catch((e) => {
                                        Logger.error(`unexpected error in data staging emitter emitter thread when attempting to put message on queue ${e}`);
                                    });
                                })
                                .finally(() => {
                                    if (staging.import_id) {
                                        // we set the cache value and push the imports into seen imports
                                        Cache.set(`imports:${staging.import_id}`, {}, Config.initial_import_cache_ttl).catch((e) => {
                                            Logger.error(`unexpected error in data staging emitter emitter thread when attempting to put import on cache ${e}`);
                                        });

                                        seenImports.set(staging.import_id, undefined);
                                    }
                                });
                        });

                        stream.on('error', (e: Error) => {
                            Logger.error(`unexpected error in data staging emitter emitter thread ${e}`);
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
