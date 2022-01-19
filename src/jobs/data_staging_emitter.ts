/*
  Standalone loop for emitting data source run events. These are emitted every
  minute for each data source, a separate processing thread will take care of
  the messages from the queue
 */

import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import {QueueFactory} from '../services/queue/queue';
import QueryStream from 'pg-query-stream';
import Logger from '../services/logger';
import Config from '../services/config';
import {plainToClass} from 'class-transformer';
import DataStagingMapper from '../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
import {DataStaging} from '../domain_objects/data_warehouse/import/import';
const devnull = require('dev-null');

const postgresAdapter = PostgresAdapter.Instance;
const dataStagingMapper = DataStagingMapper.Instance;

void postgresAdapter.init().then(() => {
    QueueFactory()
        .then((queue) => {
            const emitter = () => {
                void postgresAdapter.Pool.connect((err, client, done) => {
                    const stream = client.query(new QueryStream(dataStagingMapper.listImportUninsertedActiveMappingStatement()));
                    const putPromises: Promise<boolean>[] = [];

                    stream.on('data', (data) => {
                        // we're simply putting the id on the queue here
                        putPromises.push(queue.Put(Config.process_queue, plainToClass(DataStaging, data as object).id));
                    });

                    stream.on('end', () => {
                        done();
                        Promise.all(putPromises)
                            .then(() => {
                                setTimeout(() => emitter(), 5000);
                            })
                            .catch((e) => Logger.error(`unable to initiate data source emitter: ${e}`));
                    });

                    stream.pipe(devnull({objectMode: true}));
                });
            };

            emitter();
        })
        .catch((e) => {
            Logger.error(`unable to initiate data source emitter: ${e}`);
        });
});
