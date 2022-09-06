import DataSourceRecord, {ReceiveDataOptions} from '../../../domain_objects/data_warehouse/import/data_source';
import {DataSource} from './data_source';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import {PassThrough, Readable, Writable} from 'stream';
import {User} from '../../../domain_objects/access_management/user';
import Result from '../../../common_classes/result';
import Import, {DataStaging} from '../../../domain_objects/data_warehouse/import/import';
const JSONStream = require('JSONStream');

import pLimit from 'p-limit';

const limit = pLimit(50);

export default class TimeseriesDataSourceImpl implements DataSource {
    DataSourceRecord?: DataSourceRecord;
    // we're dealing with mappers directly because we don't need any validation
    // or the additional processing overhead the repository could cause
    #mapper = DataSourceMapper.Instance;

    constructor(record: DataSourceRecord) {
        // again we have to check for param existence because we might potentially be using class-transformer
        if (record) {
            this.DataSourceRecord = record;
        }
    }

    // see the interface declaration's explanation of ReceiveData
    async ReceiveData(payloadStream: Readable, user: User, options?: ReceiveDataOptions): Promise<Result<Import | DataStaging[] | boolean>> {
        if (!this.DataSourceRecord || !this.DataSourceRecord.id) {
            if (options?.transaction) await this.#mapper.rollbackTransaction(options?.transaction);
            return Promise.resolve(
                Result.Failure(
                    `unable to receive data, data source either doesn't have a record present or data source needs to be saved prior to data being received`,
                ),
            );
        }

        // a buffer, once it's full we'll write these records to the database and wipe to start again
        let recordBuffer: any[] = [];

        // lets us wait for all save operations to complete
        const saveOperations: Promise<Result<boolean>>[] = [];

        // our PassThrough stream is what actually processes the data, it's the last step in our eventual pipe
        const pass = new PassThrough({objectMode: true});

        pass.on('data', (data) => {
            recordBuffer.push(data);

            // if we've reached the process record limit, insert into the database and wipe the records array
            // make sure to COPY the array into bulkSave function so that we can push it into the array of promises
            // and not modify the underlying array on save, allowing us to move asynchronously,
            if (recordBuffer.length >= 1000) {
                const toSave = [...recordBuffer];
                recordBuffer = [];

                saveOperations.push(limit(() => this.#mapper.InsertIntoHypertable(this.DataSourceRecord!, toSave)));
            }
        });

        // catch any records remaining in the buffer
        pass.on('end', () => {
            saveOperations.push(limit(() => this.#mapper.InsertIntoHypertable(this.DataSourceRecord!, recordBuffer)));
        });

        // the JSONStream pipe is simple, parsing a single array of json objects into parts
        const fromJSON: Writable = JSONStream.parse('*');
        let errorMessage: any | undefined;

        // handle all transform streams, piping each in order
        if (options && options.transformStreams && options.transformStreams.length > 0) {
            let pipeline = payloadStream;

            // for the pipe process to work correctly you must wait for the pipe to finish reading all data
            await new Promise((fulfill) => {
                for (const pipe of options.transformStreams!) {
                    pipeline = pipeline.pipe(pipe).on('error', (err: any) => {
                        errorMessage = err;
                        fulfill(err);
                    });
                }

                pipeline
                    .pipe(fromJSON)
                    .on('error', (err: any) => {
                        errorMessage = err;
                        fulfill(err);
                    })
                    .pipe(pass)
                    .on('finish', fulfill);
            });
        } else if (options && options.overrideJsonStream) {
            await new Promise((fulfill) =>
                payloadStream
                    .pipe(pass)
                    .on('error', (err: any) => {
                        errorMessage = err;
                        fulfill(err);
                    })
                    .on('finish', fulfill),
            );
        } else {
            await new Promise((fulfill) =>
                payloadStream
                    .pipe(fromJSON)
                    .on('error', (err: any) => {
                        errorMessage = err;
                        fulfill(err);
                    })
                    .pipe(pass)
                    .on('finish', fulfill),
            );
        }

        if (errorMessage) {
            if (options?.transaction) await this.#mapper.rollbackTransaction(options?.transaction);
            return Promise.resolve(Result.Failure(`unable to parse JSON: ${errorMessage}`));
        }

        // we have to wait until any save operations are complete before we can act on the pipe's results
        const saveResults = await Promise.all(saveOperations);

        // if any of the save operations have an error, fail and rollback the transaction etc
        if (saveResults.filter((result) => result.isError || !result.value).length > 0) {
            if (options?.transaction) await this.#mapper.rollbackTransaction(options?.transaction);
            return Promise.resolve(
                Result.Failure(
                    `one or more attempts to save data to the database failed, encountered the following errors: ${saveResults
                        .filter((r) => r.isError)
                        .map((r) => r.error?.error)}`,
                ),
            );
        }

        if (options?.transaction) {
            const commit = await this.#mapper.completeTransaction(options?.transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        return new Promise((resolve) => resolve(Result.Success(true)));
    }

    /*
        Run allows data sources to set up a continual process that will be called
        in intervals, so far only the http poller and jazz data sources use this
        function.
     */
    Run(): Promise<void> {
        return Promise.resolve();
    }

    ToSave(): Promise<DataSourceRecord> {
        // no additional processing is needed on the record prior to storage
        return Promise.resolve(this.DataSourceRecord!);
    }
}
