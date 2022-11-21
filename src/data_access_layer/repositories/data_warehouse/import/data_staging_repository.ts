import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import {DataStaging} from '../../../../domain_objects/data_warehouse/import/import';
import DataStagingMapper from '../../../mappers/data_warehouse/import/data_staging_mapper';
import Result from '../../../../common_classes/result';
import {PoolClient} from 'pg';
import {User} from '../../../../domain_objects/access_management/user';
import File from '../../../../domain_objects/data_warehouse/data/file';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import {QueueFactory} from '../../../../services/queue/queue';
import Logger from '../../../../services/logger';
import Config from '../../../../services/config';
import DataSourceMapper from '../../../mappers/data_warehouse/import/data_source_mapper';
import {instanceToPlain} from 'class-transformer';

/*
    DataStaging contains methods for persisting and retrieving an import's data
    to storage. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning. While some domain objects are
    saved by their parents, in the case of data staging we avoid having the import
    save it do to the massive size an import could be.
 */
export default class DataStagingRepository extends Repository implements RepositoryInterface<DataStaging> {
    #mapper = DataStagingMapper.Instance;
    #fileMapper = FileMapper.Instance;

    delete(t: DataStaging): Promise<Result<boolean>> {
        if (t.id) {
            return this.#mapper.Delete(t.id);
        }

        return Promise.resolve(Result.Failure(`data record has no id`));
    }

    findByID(id: string, transaction?: PoolClient): Promise<Result<DataStaging>> {
        return this.#mapper.Retrieve(id, transaction);
    }

    async save(record: DataStaging, user?: User, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction = false;
        const errors = await record.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`import data does not pass validation ${errors.join(',')}`));

        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiated db transaction'));

            transaction = newTransaction.value;
            internalTransaction = true;
        }

        if (record.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(record.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, record);

            const updated = await this.#mapper.Update(original.value, transaction);
            if (updated.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(updated));
            }

            Object.assign(record, updated.value);
        } else {
            const created = await this.#mapper.Create(record, transaction);
            if (created.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(created));
            }

            Object.assign(record, created.value);
        }

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        return Promise.resolve(Result.Success(true));
    }

    async bulkSave(records: DataStaging[], transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction = false;
        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate db transaction'));

            transaction = newTransaction.value;
            internalTransaction = true;
        }

        const operations: Promise<Result<boolean>>[] = [];
        const toCreate: DataStaging[] = [];
        const toUpdate: DataStaging[] = [];
        const toReturn: DataStaging[] = [];

        for (const record of records) {
            operations.push(
                new Promise((resolve) => {
                    record
                        .validationErrors()
                        .then((errors) => {
                            if (errors) {
                                resolve(Result.Failure(`data staging record fails validation ${errors.join(',')}`));
                                return;
                            }

                            resolve(Result.Success(true));
                        })
                        .catch((e) => resolve(Result.Failure(`data staging record fails validation ${e}`)));
                }),
            );

            record.id ? toUpdate.push(record) : toCreate.push(record);
        }

        const completed = await Promise.all(operations);
        for (const complete of completed) {
            if (complete.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`one or more data staging records failed ${complete.error?.error}`));
            }
        }

        if (toUpdate.length > 0) {
            const saved = await this.#mapper.BulkUpdate(toUpdate, transaction);
            if (saved.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(saved));
            }

            toReturn.push(...saved.value);
        }

        if (toCreate.length > 0) {
            const saved = await this.#mapper.BulkCreate(toCreate, transaction);
            if (saved.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(saved));
            }

            toReturn.push(...saved.value);
        }

        toReturn.forEach((result, i) => {
            Object.assign(records[i], result);
        });

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        return Promise.resolve(Result.Success(true));
    }

    // bulkSaveAndSend is almost identical to bulkSave except that we also send the messagees to the processing queue
    // I needed separate function because the ReceiveData doesn't hold on to the records it saves for me to eventually
    // send them - and for the websocket one I can't wait until after this function (also can't edit the bulk save function
    // signature as it's part of the interface)
    async bulkSaveAndSend(records: DataStaging[], transaction?: PoolClient): Promise<Result<boolean>> {
        const queue = await QueueFactory();
        let internalTransaction = false;
        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate db transaction'));

            transaction = newTransaction.value;
            internalTransaction = true;
        }

        const operations: Promise<Result<boolean>>[] = [];
        const toCreate: DataStaging[] = [];
        const toUpdate: DataStaging[] = [];
        const toReturn: DataStaging[] = [];

        for (const record of records) {
            operations.push(
                new Promise((resolve) => {
                    record
                        .validationErrors()
                        .then((errors) => {
                            if (errors) {
                                resolve(Result.Failure(`data staging record fails validation ${errors.join(',')}`));
                                return;
                            }

                            resolve(Result.Success(true));
                        })
                        .catch((e) => resolve(Result.Failure(`data staging record fails validation ${e}`)));
                }),
            );

            record.id ? toUpdate.push(record) : toCreate.push(record);
        }

        const completed = await Promise.all(operations);
        for (const complete of completed) {
            if (complete.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`one or more data staging records failed ${complete.error?.error}`));
            }
        }

        if (toUpdate.length > 0) {
            const saved = await this.#mapper.BulkUpdate(toUpdate, transaction);
            if (saved.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(saved));
            }

            toReturn.push(...saved.value);
        }

        if (toCreate.length > 0) {
            const saved = await this.#mapper.BulkCreate(toCreate, transaction);
            if (saved.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(saved));
            }

            toReturn.push(...saved.value);
        }

        toReturn.forEach((result, i) => {
            Object.assign(records[i], result);
            // we ignore any errors apart from logging
            void queue.Put(Config.process_queue, records[i]).catch((e) => Logger.error(e));
        });

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        return Promise.resolve(Result.Success(true));
    }

    setInserted(t: DataStaging, transaction?: PoolClient): Promise<Result<boolean>> {
        if (t.id) {
            return this.#mapper.SetInserted(t.id, transaction);
        }

        return Promise.resolve(Result.Failure(`data record must have id`));
    }

    // completely override the error set
    setErrors(id: string, errors: string[], transaction?: PoolClient): Promise<Result<boolean>> {
        return this.#mapper.SetErrors(id, errors, transaction);
    }

    // add an error to an existing error set
    addError(id: string, errors: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return this.#mapper.AddError(id, errors, transaction);
    }

    addFile(t: DataStaging, fileID: string): Promise<Result<boolean>> {
        if (!t.id) {
            return Promise.resolve(Result.Failure('staging record must have id'));
        }

        return this.#mapper.AddFile(t.id, fileID);
    }

    removeFile(t: DataStaging, fileID: string): Promise<Result<boolean>> {
        if (!t.id) {
            return Promise.resolve(Result.Failure('staging record must have id'));
        }

        return this.#mapper.RemoveFile(t.id, fileID);
    }

    listFiles(t: DataStaging): Promise<Result<File[]>> {
        if (!t.id) {
            return Promise.resolve(Result.Failure('staging record must have id'));
        }

        return this.#fileMapper.ListForDataStaging(t.id);
    }

    // sendToQueueForImport will queue up all data staging records for a given import
    // needed for us to reprocess an import individually, and as part of the receive
    // data call
    async sendToQueueForImport(importID: string): Promise<void> {
        const queue = await QueueFactory();

        const records = await this.#mapper.ListIDOnly(importID);
        if (records.isError) {
            Logger.error('unable to list staging records for sending to queue');
        }

        const queuePromises: Promise<boolean>[] = [];

        records.value.forEach((record) => {
            queuePromises.push(queue.Put(Config.process_queue, record.id));
        });

        await Promise.all(queuePromises);

        return Promise.resolve();
    }

    constructor() {
        super(DataStagingMapper.tableName);

        this._query.SELECT = [
            `SELECT ${this._tableAlias}.*, data_sources.container_id, data_sources.config AS data_source_config`,
            `FROM data_staging ${this._tableAlias} 
            LEFT JOIN data_sources ON data_sources.id = ${this._tableAlias}.data_source_id`,
        ];
    }

    dataSourceID(operator: string, value: any) {
        super.query('data_source_id', operator, value);
        return this;
    }

    importID(operator: string, value: any) {
        super.query('import_id', operator, value);
        return this;
    }

    shapeHash(operator: string, value?: any) {
        super.query('shape_hash', operator, value);
        return this;
    }

    // these listing functions are separate from the main filter due to some more
    // complicated query behavior than the filter can currently handle
    listUninsertedActiveMapping(importID: string, offset: number, limit: number, transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        return this.#mapper.ListUninsertedActiveMapping(importID, offset, limit, transaction);
    }

    async count(transaction?: PoolClient): Promise<Result<number>> {
        const results = await super.count(transaction);

        this._query.SELECT = [
            `SELECT ${this._tableAlias}.*, data_sources.container_id, data_sources.config AS data_source_config`,
            `FROM data_staging ${this._tableAlias} 
            LEFT JOIN data_sources ON data_sources.id = ${this._tableAlias}.data_source_id`,
        ];

        return Promise.resolve(Result.Pass(results));
    }

    countUninsertedForImport(importID: string, transaction?: PoolClient): Promise<Result<number>> {
        return this.#mapper.CountUninsertedForImport(importID, transaction);
    }

    countUninsertedActiveMappingForImport(importID: string, transaction?: PoolClient): Promise<Result<number>> {
        return this.#mapper.CountUninsertedActiveMapping(importID, transaction);
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        const results = await super.findAll<DataStaging>(options, {
            transaction,
            resultClass: DataStaging,
        });

        this._query.SELECT = [
            `SELECT ${this._tableAlias}.*, data_sources.container_id, data_sources.config AS data_source_config`,
            `FROM data_staging ${this._tableAlias} 
            LEFT JOIN data_sources ON data_sources.id = ${this._tableAlias}.data_source_id`,
        ];

        return Promise.resolve(Result.Pass(results));
    }
}
