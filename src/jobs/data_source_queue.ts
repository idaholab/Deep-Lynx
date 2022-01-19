import {QueueFactory} from '../services/queue/queue';
import Config from '../services/config';
import Logger from '../services/logger';
import {Writable} from 'stream';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import DataSourceRepository from '../data_access_layer/repositories/data_warehouse/import/data_source_repository';

void PostgresAdapter.Instance.init().then(() => {
    const dataSourceRepo = new DataSourceRepository();

    void QueueFactory().then((queue) => {
        const destination = new Writable({
            objectMode: true,
            write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
                dataSourceRepo
                    .findByID(chunk as string)
                    .then((source) => {
                        if (source.isError) {
                            Logger.error(`unable to fetch data source ${source.error?.error}`);
                            callback();
                            return;
                        }
                        source.value
                            .Run()
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

        queue.Consume(Config.data_sources_queue, destination);
    });
});
