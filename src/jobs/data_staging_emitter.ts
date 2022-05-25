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
const devnull = require('dev-null');
process.setMaxListeners(0);

const postgresAdapter = PostgresAdapter.Instance;
const dataStagingMapper = DataStagingMapper.Instance;

void postgresAdapter
    .init()
    .then(() => {
        QueueFactory()
            .then((queue) => {
                const emitter = () => {
                    void postgresAdapter.Pool.connect((err, client, done) => {
                        const stream = client.query(new QueryStream(dataStagingMapper.listImportUninsertedActiveMappingStatement()));
                        const putPromises: Promise<boolean>[] = [];
                        const seenImports: string[] = [];

                        stream.on('data', (data) => {
                            const staging = plainToClass(DataStaging, data as object);

                            // check to see if the importID is in the cache, indicating that there is a high probability that
                            // this message is already in the queue and either is being processed or waiting to be processed
                            Cache.get(`imports_${staging.import_id}`)
                                .then((set) => {
                                    if (!set) {
                                        // if the import isn't the cache, we can go ahead and queue the staging data
                                        putPromises.push(queue.Put(Config.process_queue, staging));
                                    }
                                })
                                // if we error out we need to go ahead and queue this message anyway, just so we're not dropping
                                // data
                                .catch((e) => {
                                    Logger.error(`error reading from cache for staging emitter ${e}`);
                                    putPromises.push(queue.Put(Config.process_queue, staging));
                                })
                                .finally(() => {
                                    if (staging.import_id) {
                                        seenImports.push(staging.import_id);
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

                            Promise.all(putPromises)
                                .then(() => {
                                    const cachePromises: Promise<any>[] = [];

                                    seenImports.forEach((importID) => {
                                        cachePromises.push(Cache.set(`imports_${importID}`, {}, Config.initial_import_cache_ttl));
                                    });

                                    Promise.all(cachePromises).finally(() => setTimeout(() => emitter(), 5000));
                                })
                                .catch((e) => Logger.error(`unable to initiate data source emitter: ${e}`));
                        });

                        // we pipe to devnull because we need to trigger the stream and don't
                        // care where the data ultimately ends up
                        stream.pipe(devnull({objectMode: true}));
                    });
                };

                emitter();
            })
            .catch((e) => {
                Logger.error(`unable to initiate data source emitter: ${e}`);
                if (parentPort) parentPort.postMessage('done');
                else {
                    process.exit(0);
                }
            });
    })
    .catch((e) => {
        Logger.error(`unexpected error in data staging emitter thread ${e}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(0);
        }
    });
