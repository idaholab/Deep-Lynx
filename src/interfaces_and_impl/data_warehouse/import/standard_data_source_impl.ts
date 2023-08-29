import DataSourceRecord, {ReceiveDataOptions} from '../../../domain_objects/data_warehouse/import/data_source';
import ImportRepository from '../../../data_access_layer/repositories/data_warehouse/import/import_repository';
import DataStagingRepository from '../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import ImportMapper from '../../../data_access_layer/mappers/data_warehouse/import/import_mapper';
import Logger from '../../../services/logger';
import Config from '../../../services/config';
import Import, {DataStaging} from '../../../domain_objects/data_warehouse/import/import';
import Result from '../../../common_classes/result';
import {User} from '../../../domain_objects/access_management/user';
import {PassThrough, Readable, Writable, Transform} from 'stream';
import TypeMapping from '../../../domain_objects/data_warehouse/etl/type_mapping';
import {DataSource} from './data_source';
import {QueueFactory} from '../../../services/queue/queue';
const JSONStream = require('JSONStream');
import Cache from '../../../services/cache/cache';
const devnull = require('dev-null');

/*
    StandardDataSourceImpl is the most basic of data sources, and serves as the base
    for the Http data source. Users will generally interact with the DataSource interface
    over the implementation directly.
 */
export default class StandardDataSourceImpl implements DataSource {
    DataSourceRecord?: DataSourceRecord;
    // we're dealing with mappers directly because we don't need any validation
    // or the additional processing overhead the repository could cause
    #mapper = DataSourceMapper.Instance;
    #importRepo = new ImportRepository();
    #stagingRepo = new DataStagingRepository();

    constructor(record: DataSourceRecord) {
        // again we have to check for param existence because we might potentially be using class-transformer
        if (record) {
            this.DataSourceRecord = record;
        }
    }

    // see the interface declaration's explanation of ReceiveData
    async ReceiveData(payloadStream: Readable, user: User, options?: ReceiveDataOptions): Promise<Result<Import | boolean>> {
        if (!this.DataSourceRecord || !this.DataSourceRecord.id) {
            return Promise.resolve(Result.Failure('cannot receive data, no underlying or saved data source record'));
        }

        if (!this.DataSourceRecord || !this.DataSourceRecord.id) {
            if (options?.transaction) await this.#mapper.rollbackTransaction(options?.transaction);
            return Promise.resolve(
                Result.Failure(
                    `unable to receive data, data source either doesn't have a record present or data source needs to be saved prior to data being received`,
                ),
            );
        }

        let importID: string;

        if (options && options.importID) {
            importID = options.importID;
        } else {
            // we're not making the import as part of the transaction because even if we error, we want to record the
            // problem - and if we have 0 data retention on the source we need the import created prior to loading up
            // the data as messages for the process queue
            const newImport = await ImportMapper.Instance.CreateImport(
                user.id!,
                new Import({
                    data_source_id: this.DataSourceRecord.id,
                    reference: 'manual upload',
                }),
            );

            if (newImport.isError) {
                if (options?.transaction) await this.#mapper.rollbackTransaction(options?.transaction);
                return Promise.resolve(Result.Failure(`unable to create import for data ${newImport.error?.error}`));
            }

            importID = newImport.value.id!;
            if (options?.websocket) {
                options.websocket.send(JSON.stringify(newImport.value));
            }
        }

        // we used to lock this for receiving data, but it makes no sense as this is an additive process which does not
        // modify the import in any way. Locking prevented the mapper from running correctly.
        const retrievedImport = await this.#importRepo.findByID(importID, options?.transaction);
        if (retrievedImport.isError) {
            if (options?.transaction) await this.#mapper.rollbackTransaction(options?.transaction);
            Logger.error(`unable to retrieve and lock import ${retrievedImport.error}`);
            return Promise.resolve(Result.Failure(`unable to retrieve ${retrievedImport.error?.error}`));
        }

        // set the cache value, so we don't spam with the listing function
        await Cache.set(`imports:${importID}`, {}, Config.initial_import_cache_ttl);

        // a buffer, once it's full we'll write these records to the database and wipe to start again
        let recordBuffer: DataStaging[] = [];

        // lets us wait for all save operations to complete - we can still fail fast on a bad import since all the
        // save operations will share the same database transaction under the hood - that is if we're saving and not
        // emitting the data straight to the queue
        const saveOperations: Promise<Result<boolean>>[] = [];

        // our Transform stream is what actually processes the data, it's the last step in our eventual pipe
        let transform: Transform | undefined = undefined;
        const queue = await QueueFactory();

        // store relevant properties belonging to `this` in variables for use in the transform stream
        const dataSourceRecord = this.DataSourceRecord!;
        const stagingRepo = this.#stagingRepo;
        // set a default buffer size if none specified
        const bufferSize = (options && options.bufferSize) ? options.bufferSize : 1000;

        if (
            !dataSourceRecord.config?.data_retention_days ||
            (dataSourceRecord.config?.data_retention_days && dataSourceRecord.config.data_retention_days !== 0)
        ) {
            // batch save data and add it to queue
            transform = new Transform({
                transform(chunk: any, encoding: any, callback: any) {
                    recordBuffer.push(
                        new DataStaging({
                            container_id: dataSourceRecord.container_id,
                            data_source_id: dataSourceRecord.id!,
                            import_id: retrievedImport.value.id!,
                            data: chunk,
                            shape_hash: TypeMapping.objectToShapeHash(chunk, {
                                value_nodes: dataSourceRecord.config?.value_nodes,
                                stop_nodes: dataSourceRecord.config?.stop_nodes,
                            }),
                            file_attached: options?.has_files,
                        })
                    );

                    // if we've reached the process record limit, insert into the database and wipe the records array
                    // make sure to COPY the array into bulkSave function so that we can push it into the array of promises
                    // and not modify the underlying array on save, allowing us to move asynchronously - if we have an open
                    // websocket we also want to save it immediately
                    if (recordBuffer.length >= bufferSize) {
                        const toSave = [...recordBuffer];
                        recordBuffer = [];
                        stagingRepo.bulkSaveAndSend(toSave, options?.transaction)
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
                saveOperations.push(this.#stagingRepo.bulkSaveAndSend(recordBuffer, options?.transaction));
            })
        } else {
            // if data retention isn't configured, or it is 0 - we do not retain the data permanently
            // instead of our pipe saving data staging records to the database and having them emitted
            // later we immediately put the full message on the queue for processing - we also only log
            // errors that we encounter when putting on the queue, we don't fail outright
            transform = new Transform({
                transform(chunk: any, encoding: any, callback: any) {
                    recordBuffer.push(
                        new DataStaging({
                            container_id: dataSourceRecord.container_id,
                            data_source_id: dataSourceRecord.id!,
                            import_id: retrievedImport.value.id!,
                            data: chunk,
                            shape_hash: TypeMapping.objectToShapeHash(chunk, {
                                value_nodes: dataSourceRecord.config?.value_nodes,
                                stop_nodes: dataSourceRecord.config?.stop_nodes,
                            }),
                            file_attached: options?.has_files,
                        })
                    );

                    if (recordBuffer.length >= bufferSize) {
                        const toSave = [...recordBuffer];
                        recordBuffer = [];
                        queue.Put(Config.process_queue, toSave)
                            .then(() => {
                                // @ts-ignore
                                this.push(new Buffer.from(chunk.toString()));
                                callback(null);
                            })
                            .catch((err) => {
                                callback(err);
                                Logger.error(`unable to put data staging record on the queue ${err}`)
                            });
                    } else {
                        // @ts-ignore
                        this.push(new Buffer.from(chunk.toString()));
                        callback(null);
                    }
                },
                objectMode: true,
            });

            // catch any records remaining in the buffer
            transform.on('end', () => {
                queue.Put(Config.process_queue, recordBuffer)
                    .then(() => {
                        console.log('All records added to queue successfully');
                    })
                    .catch((err) => {
                        Logger.error('Error while adding staging records to queue', err);
                    });
            });
        }

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
                        if (options.errorCallback) options.errorCallback(err);
                        fulfill(err);
                    })
                    .pipe(transform!)
                    .pipe(devnull())
                    .on('finish', fulfill);
            });
        } else if (options && options.overrideJsonStream) {
            await new Promise((fulfill) =>
                payloadStream
                    .pipe(transform!)
                    .on('error', (err: any) => {
                        errorMessage = err;
                        if (options.errorCallback) options.errorCallback(err);
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
                    .pipe(transform!)
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

        return new Promise((resolve) => resolve(Result.Success(retrievedImport.value)));
    }

    /*
        Run allows data sources to set up a continual process that will be called
        in intervals, so far only the http poller data source uses this function,
        jazz did but has been deprecated.
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
}
