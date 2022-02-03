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
import DataStagingRepository from '../data_access_layer/repositories/data_warehouse/import/data_staging_repository';

void PostgresAdapter.Instance.init().then(() => {
    const stagingRepo = new DataStagingRepository();

    void QueueFactory().then((queue) => {
        const destination = new Writable({
            objectMode: true,
            write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
                stagingRepo
                    .findByID(chunk as string)
                    .then((staging) => {
                        if (staging.isError) {
                            Logger.error(`unable to fetch data staging record ${staging.error?.error}`);
                            callback();
                            return;
                        }
                        ProcessData(staging.value)
                            .then(() => {
                                callback();
                            })
                            .catch((e) => {
                                Logger.error(`unable to process event from queue ${e}`);
                                callback();
                            });
                    })
                    .catch((e) => {
                        Logger.error(`unable to process event from queue ${e}`);
                        callback();
                    });

                return true;
            },
        });

        queue.Consume(Config.process_queue, destination);
    });
});
