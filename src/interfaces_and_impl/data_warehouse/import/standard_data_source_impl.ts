import DataSourceRecord, {ReceiveDataOptions} from '../../../domain_objects/data_warehouse/import/data_source';
import ImportRepository from '../../../data_access_layer/repositories/data_warehouse/import/import_repository';
import DataStagingRepository from '../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import ImportMapper from '../../../data_access_layer/mappers/data_warehouse/import/import_mapper';
import Logger from '../../../services/logger';
import Config from '../../../services/config';
import Import, {DataStaging} from '../../../domain_objects/data_warehouse/import/import';
import {PoolClient} from 'pg';
import Result from '../../../common_classes/result';
import {User} from '../../../domain_objects/access_management/user';
import {PassThrough, Readable} from 'stream';
import TypeMapping from '../../../domain_objects/data_warehouse/etl/type_mapping';
import {DataSource} from './data_source';
const JSONStream = require('JSONStream');

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
    async ReceiveData(payloadStream: Readable, user: User, options?: ReceiveDataOptions): Promise<Result<Import | DataStaging[]>> {
        if (!this.DataSourceRecord || !this.DataSourceRecord.id) {
            return Promise.resolve(Result.Failure('cannot receive data, no underlying or saved data source record'));
        }

        let internalTransaction = false;
        let transaction: PoolClient;

        if (options && options.transaction) {
            transaction = options.transaction;
        } else {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiated db transaction'));

            transaction = newTransaction.value;
            internalTransaction = true;
        }

        if (!this.DataSourceRecord || !this.DataSourceRecord.id) {
            if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
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
            const newImport = await ImportMapper.Instance.CreateImport(
                user.id!,
                new Import({
                    data_source_id: this.DataSourceRecord.id,
                    reference: 'manual upload',
                }),
                transaction,
            );

            if (newImport.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`unable to create import for data ${newImport.error?.error}`));
            }

            importID = newImport.value.id!;
        }

        // we used to lock this for receiving data, but it makes no sense as this is an additive process which does not
        // modify the import in any way. Locking prevented the mapper from running correctly.
        const retrievedImport = await this.#importRepo.findByID(importID, transaction);
        if (retrievedImport.isError) {
            if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
            Logger.error(`unable to retrieve and lock import ${retrievedImport.error}`);
            return Promise.resolve(Result.Failure(`unable to retrieve and lock import ${retrievedImport.error?.error}`));
        }

        // basically a buffer, once it's full we'll write these records to the database and wipe to start again
        let recordBuffer: DataStaging[] = [];

        // let's us wait for all save operations to complete - we can still fail fast on a bad import since all the
        // save operations will share the same database transaction under the hood
        const saveOperations: Promise<Result<boolean>>[] = [];

        // our PassThrough stream is what actually processes the data, it's the last step in our eventual pipe
        const pass = new PassThrough({objectMode: true});

        pass.on('data', (data) => {
            recordBuffer.push(
                new DataStaging({
                    data_source_id: this.DataSourceRecord!.id!,
                    import_id: retrievedImport.value.id!,
                    data,
                    shape_hash: options && options.generateShapeHash ? TypeMapping.objectToShapeHash(data) : undefined,
                }),
            );

            // if we've reached the process record limit, insert into the database and wipe the records array
            // make sure to COPY the array into bulkSave function so that we can push it into the array of promises
            // and not modify the underlying array on save, allowing us to move asynchronously,
            if (recordBuffer.length >= Config.data_source_receive_buffer) {
                // if we are returning
                // the staging records, don't wipe the buffer just keep adding
                if (!options || !options.returnStagingRecords) {
                    const toSave = [...recordBuffer];
                    recordBuffer = [];

                    saveOperations.push(this.#stagingRepo.bulkSave(toSave, transaction));
                }
            }
        });

        // catch any records remaining in the buffer
        pass.on('end', () => {
            saveOperations.push(this.#stagingRepo.bulkSave(recordBuffer, transaction));
        });

        // the JSONStream pipe is simple, parsing a single array of json objects into parts
        const fromJSON = JSONStream.parse('*');

        // handle all transform streams, piping each in order
        if (options && options.transformStreams && options.transformStreams.length > 0) {
            let pipeline = payloadStream;

            for (const pipe of options.transformStreams) {
                pipeline = pipeline.pipe(pipe);
            }

            // for the pipe process to work correctly you must wait for the pipe to finish reading all data
            await new Promise((fulfill) => pipeline.pipe(fromJSON).pipe(pass).on('finish', fulfill));
        } else if (options && options.overrideJsonStream) {
            await new Promise((fulfill) => payloadStream.pipe(pass).on('finish', fulfill));
        } else {
            await new Promise((fulfill) => payloadStream.pipe(fromJSON).pipe(pass).on('finish', fulfill));
        }

        // we have to wait until any save operations are complete before we can act on the pipe's results
        const saveResults = await Promise.all(saveOperations);

        // if any of the save operations have an error, fail and rollback the transaction etc
        if (saveResults.filter((result) => result.isError || !result.value).length > 0) {
            if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
            return Promise.resolve(
                Result.Failure(
                    `one or more attempts to save data to the database failed, encountered the following errors: ${saveResults
                        .filter((r) => r.isError)
                        .map((r) => r.error)}`,
                ),
            );
        }

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        // return the saved buffer as we haven't wiped it, should contain all records with their updated IDs
        if (options && options.returnStagingRecords) {
            return new Promise((resolve) => resolve(Result.Success(recordBuffer)));
        }

        return new Promise((resolve) => resolve(Result.Success(retrievedImport.value)));
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

    delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
