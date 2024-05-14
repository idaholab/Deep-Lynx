/*
  Standalone loop for emitting data source run events. These are emitted every
  minute for each data source, a separate processing thread will take care of
  the messages from the queue
 */

import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import DataSourceMapper from '../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import QueryStream from 'pg-query-stream';
import Logger from '../services/logger';
import Cache from '../services/cache/cache';
import Config from '../services/config';
import {parentPort} from 'worker_threads';
import {plainToClass} from 'class-transformer';
import DataSourceRecord from '../domain_objects/data_warehouse/import/data_source';
import {Transform, TransformCallback} from 'stream';
import {DataSourceFactory} from '../data_access_layer/repositories/data_warehouse/import/data_source_repository';
const devnull = require('dev-null');
process.setMaxListeners(0);

const postgresAdapter = PostgresAdapter.Instance;
const dataSourceMapper = DataSourceMapper.Instance;

// handle cache clears from parent IF memory cache
if (Config.cache_provider === 'memory') {
    parentPort?.on('message', (message: any) => {
        const parts: string[] = message.split('|');
        // if a two part message it's a deleted key
        if (parts.length === 2 && parts[0] === 'deleted') {
            void Cache.del(parts[1]);
        }

        if (parts.length === 1 && parts[0] === 'flush') {
            void Cache.flush();
        }
    });
}

async function Start(): Promise<void> {
    await postgresAdapter.init();
    const factory = new DataSourceFactory();

    const client = await postgresAdapter.Pool.connect();
    const stream = client.query(new QueryStream(dataSourceMapper.listAllActiveStatement()));

    // because the data sources might be dealing with I/O - we don't want to make one data source wait on anther's
    // execution. In order to do this, and not swamp the memory of the process we use a custom transform stream
    // to provide backpressure on promises resolving from calling the data-source's run function
    class transform extends Transform {
        public putPromises: Promise<void>[] = [];

        constructor() {
            super({
                objectMode: true,
                transform: (data: any, encoding: BufferEncoding, callback: TransformCallback) => {
                    const source = plainToClass(DataSourceRecord, data as object);

                    // check to see if the data source ID is in the cache, indicating that there is a high probability that
                    // this message is already in the queue and is either being processed or waiting to be processed
                    factory
                        .fromDataSourceRecord(source)
                        .then((dataSource) => {
                            this.putPromises.push(dataSource!.Run());
                        })
                        .catch((e) => {
                            Logger.error(`error in data source processing thread ${e}`);
                        })
                        .finally(() => {
                            // check the buffer, await if needed
                            if (this.putPromises.length > 500) {
                                const buffer = [...this.putPromises];
                                this.putPromises = [];
                                void Promise.all(buffer)
                                    .catch((e: Error) => {
                                        Logger.error(`error while awaiting put promises in data source processing thread${JSON.stringify(e)}`);
                                        callback(e, null);
                                    })
                                    .finally(() => {
                                        callback(null);
                                    });
                            } else {
                                callback(null);
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
                    Logger.error(`error while awaiting promises in the data source processing thread${JSON.stringify(e)}`);
                    if (parentPort) parentPort.postMessage('done');
                    else {
                        process.exit(1);
                    }
                })
                .finally(() => {
                    client.release();
                });
        } else {
            client.release();
        }
    });

    emitterStream.on('error', (e: Error) => {
        Logger.error(`unexpected error in data source processing thread ${JSON.stringify(e)}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });

    stream.on('error', (e: Error) => {
        Logger.error(`unexpected error in data source processing thread ${JSON.stringify(e)}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });

    // we pipe to devnull because we need to trigger the stream and don't
    // care where the data ultimately ends up
    stream.pipe(emitterStream).pipe(devnull({objectMode: true}));
}

void Start();
