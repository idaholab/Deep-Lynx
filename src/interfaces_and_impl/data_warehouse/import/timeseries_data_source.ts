import DataSourceRecord, {ReceiveDataOptions, TimeseriesDataSourceConfig} from '../../../domain_objects/data_warehouse/import/data_source';
import {DataSource} from './data_source';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import {PassThrough, Readable, Writable, Transform} from 'stream';
import {User} from '../../../domain_objects/access_management/user';
import Result from '../../../common_classes/result';
import Import, {DataStaging} from '../../../domain_objects/data_warehouse/import/import';
const JSONStream = require('JSONStream');
const devnull = require('dev-null');

import pLimit from 'p-limit';
import TimeseriesService from '../../../services/timeseries/timeseries';
import {LegacyTimeseriesColumn} from 'deeplynx-timeseries';

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

    async fastLoad(payloadStream: Readable): Promise<void> {
        const formatMemoryUsage = (data: any) => `${Math.round((data / 1024 / 1024) * 100) / 100} MB`;

        const memoryData = process.memoryUsage();

        const memoryUsage = {
            rss: `${formatMemoryUsage(memoryData.rss)} -> Resident Set Size - total memory allocated for the process execution`,
            heapTotal: `${formatMemoryUsage(memoryData.heapTotal)} -> total size of the allocated heap`,
            heapUsed: `${formatMemoryUsage(memoryData.heapUsed)} -> actual memory used during the execution`,
            external: `${formatMemoryUsage(memoryData.external)} -> V8 external memory`,
        };

        console.log(memoryUsage);

        let timeseriesService = await TimeseriesService.GetInstance();

        return new Promise((resolve, reject) => {
            timeseriesService.beginLegacyCsvIngestion(
                this.DataSourceRecord?.id!,
                (this.DataSourceRecord?.config as TimeseriesDataSourceConfig).columns as LegacyTimeseriesColumn[],
            );

            let pass = new PassThrough();

            pass.on('data', (chunk: any) => {
                timeseriesService.readData(chunk);
            });

            pass.on('error', (e: any) => {
                return Promise.resolve(Result.Failure(JSON.stringify(e)));
            });

            pass.on('finish', () => {
                timeseriesService
                    .completeIngestion()
                    .then(() => resolve())
                    .catch((e) => {
                        reject(e.message);
                    });
            });

            payloadStream.pipe(pass);
        });
    }

    // see the interface declaration's explanation of ReceiveData
    async ReceiveData(payloadStream: Readable, user: User, options?: ReceiveDataOptions): Promise<Result<Import | boolean>> {
        if (!this.DataSourceRecord || !this.DataSourceRecord.id) {
            if (options?.transaction) await this.#mapper.rollbackTransaction(options?.transaction);
            return Promise.resolve(
                Result.Failure(
                    `unable to receive data, data source either doesn't have a record present or data source needs to be saved prior to data being received`,
                ),
            );
        }

        if (options?.fast_load) {
            await this.fastLoad(payloadStream);
            return Promise.resolve(Result.Success(true));
        }

        // a buffer, once it's full we'll write these records to the database and wipe to start again
        let recordBuffer: any[] = [];

        // lets us wait for all save operations to complete
        const saveOperations: Promise<Result<boolean>>[] = [];

        // store relevant properties belonging to `this` in variables for use in the transform stream
        const mapper = this.#mapper;
        const dataSourceRecord = this.DataSourceRecord!;

        const transform = new Transform({
            transform(chunk: any, encoding: any, callback: any) {
                recordBuffer.push(chunk);

                // if we've reached the process record limit, insert into the database and wipe the records array
                // make sure to COPY the array into bulkSave function so that we can push it into the array of promises
                // and not modify the underlying array on save, allowing us to move asynchronously,
                if (!options || recordBuffer.length >= options.bufferSize) {
                    const toSave = [...recordBuffer];
                    recordBuffer = [];

                    mapper
                        .InsertIntoHypertable(dataSourceRecord, toSave)
                        .then(() => {
                            // @ts-ignore
                            this.push(new Buffer.from(chunk.toString()));
                            callback(null);
                        })
                        .catch((err) => {
                            callback(err);
                        });
                } else {
                    // @ts-ignore
                    this.push(new Buffer.from(chunk.toString()));
                    callback(null);
                }
            },
            objectMode: true,
        });

        transform.on('end', () => {
            saveOperations.push(limit(() => this.#mapper.InsertIntoHypertable(this.DataSourceRecord!, recordBuffer)));
        });

        // the JSONStream pipe is simple, parsing a single array of json objects into parts
        const fromJSON: Writable = JSONStream.parse('*');
        let errorMessage: any | undefined;

        // handle all transform streams, piping each in order
        if (options && options.transformStream) {
            // for the pipe process to work correctly you must wait for the pipe to finish reading all data
            await new Promise((fulfill) => {
                payloadStream
                    .pipe(options.transformStream!)
                    .pipe(fromJSON)
                    .on('error', (err: any) => {
                        errorMessage = err;
                        if (options?.errorCallback) options.errorCallback(err);
                        fulfill(err);
                    })
                    .pipe(transform)
                    .pipe(devnull())
                    .on('finish', fulfill);
            });
        } else if (options && options.overrideJsonStream) {
            await new Promise((fulfill) =>
                payloadStream
                    .pipe(transform)
                    .on('error', (err: any) => {
                        errorMessage = err;
                        if (options?.errorCallback) options.errorCallback(err);
                        fulfill(err);
                    })
                    .pipe(devnull())
                    .on('finish', fulfill),
            );
        } else {
            await new Promise((fulfill) =>
                payloadStream
                    .pipe(fromJSON)
                    .on('error', (err: any) => {
                        errorMessage = err;
                        if (options?.errorCallback) options.errorCallback(err);
                        fulfill(err);
                    })
                    .pipe(transform)
                    .pipe(devnull())
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

    ToExport(): Promise<DataSourceRecord> {
        return Promise.resolve(this.DataSourceRecord!);
    }

    timer(ms: number): Promise<any> {
        return new Promise((resolve) => {
            setTimeout(() => resolve(true), ms);
        });
    }
}
