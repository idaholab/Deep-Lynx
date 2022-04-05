/*
    This starts a never-ending loop of consuming data processing messages from the queue.
    Each of those messages consists of a data staging record id which is then fetched and
    sent to be be processed.
 */
import {QueueFactory} from '../services/queue/queue';
import Config from '../services/config';
import Logger from '../services/logger';
import {Writable} from 'stream';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import {ProcessData} from '../data_processing/process';
import {plainToClass} from 'class-transformer';
import {DataStaging} from '../domain_objects/data_warehouse/import/import';

process.setMaxListeners(0);

void PostgresAdapter.Instance.init().then(() => {
    void QueueFactory().then((queue) => {
        const destination = new Writable({
            objectMode: true,
            write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
                const stagingRecord = plainToClass(DataStaging, chunk as object);
                ProcessData(stagingRecord)
                    .then(() => {
                        callback();
                    })
                    .catch((e) => {
                        Logger.error(`unable to process data from queue ${e}`);
                        callback();
                    });

                return true;
            },
        });

        queue.Consume(Config.process_queue, destination);
    });
});
