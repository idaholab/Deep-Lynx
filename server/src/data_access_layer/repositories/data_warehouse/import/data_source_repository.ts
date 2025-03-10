import RepositoryInterface, {DeleteOptions, FileOptions, QueryOptions, Repository} from '../../repository';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import DataSourceMapper, {TimeseriesRange} from '../../../mappers/data_warehouse/import/data_source_mapper';
import HttpDataSourceImpl from '../../../../interfaces_and_impl/data_warehouse/import/http_data_source_impl';
import StandardDataSourceImpl from '../../../../interfaces_and_impl/data_warehouse/import/standard_data_source_impl';
import Result from '../../../../common_classes/result';
import {User} from '../../../../domain_objects/access_management/user';
import {PoolClient} from 'pg';
import ImportMapper from '../../../mappers/data_warehouse/import/import_mapper';
import AvevaDataSourceImpl from '../../../../interfaces_and_impl/data_warehouse/import/aveva_data_source';
import P6DataSourceImpl from '../../../../interfaces_and_impl/data_warehouse/import/p6_data_source';
import {DataSource} from '../../../../interfaces_and_impl/data_warehouse/import/data_source';
import ImportRepository from './import_repository';
import TimeseriesDataSourceImpl from '../../../../interfaces_and_impl/data_warehouse/import/timeseries_data_source';
import File from '../../../../domain_objects/data_warehouse/data/file';
import {plainToClass} from 'class-transformer';
import CustomDataSourceImpl from '../../../../interfaces_and_impl/data_warehouse/import/custom_data_source';
import DataStagingMapper from '../../../mappers/data_warehouse/import/data_staging_mapper';

/*
    DataSourceRepository contains methods for persisting and retrieving data sources
    to storage as well as managing things like validation and the starting/stopping
    of said data source's process loops.Users should interact with repositories
    when possible and not the mappers as the repositories contain additional logic
    such as validation or transformation prior to storage or returning. This
    repository especially returns an interface vs. concrete class and exposes
    more operations than exist if you just use the mapper.
 */
export default class DataSourceRepository extends Repository implements RepositoryInterface<DataSource> {
    #mapper = DataSourceMapper.Instance;
    #importRepo = new ImportRepository();
    #factory = new DataSourceFactory();
    #groupBy?: string[];

    async delete(t: DataSource, options?: DeleteOptions): Promise<Result<boolean>> {
        if (!t.DataSourceRecord || !t.DataSourceRecord.id)
            return Promise.resolve(Result.Failure(`cannot delete data source: no data source record or record lacking id`));
        const hasImports = await ImportMapper.Instance.ExistForDataSource(t.DataSourceRecord.id);

        if (options) {
            if (hasImports.value || (options.force && options.removeData)) return this.#mapper.DeleteWithData(t.DataSourceRecord.id);
            else if (!hasImports.value || options.force) return this.#mapper.Delete(t.DataSourceRecord.id);
        } else {
            if (!hasImports.value) return this.#mapper.Delete(t.DataSourceRecord.id);
        }

        return Promise.resolve(Result.Failure(`Data Source has data associated with it, this data must be removed or user must force delete.`));
    }

    async archive(u: User, t: DataSource): Promise<Result<boolean>> {
        if (!t.DataSourceRecord || !t.DataSourceRecord.id)
            return Promise.resolve(Result.Failure(`cannot archive data source: no data source record or record lacking id`));

        return this.#mapper.Archive(t.DataSourceRecord.id, u.id!);
    }

    async findByID(id: string): Promise<Result<DataSource>> {
        const dataSourceRecord = await this.#mapper.Retrieve(id);
        if (dataSourceRecord.isError) return Promise.resolve(Result.Pass(dataSourceRecord));

        const dataSource = await this.#factory.fromDataSourceRecord(dataSourceRecord.value);
        if (!dataSource) return Promise.resolve(Result.Failure(`unable to create data source from data source record`));

        return Promise.resolve(Result.Success(dataSource));
    }

    async save(t: DataSource, user: User): Promise<Result<boolean>> {
        if (!t.DataSourceRecord) return Promise.resolve(Result.Failure(`Data Source must have a data source record instantiated`));

        const errors = await t.DataSourceRecord.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`attached data source record does not pass validation ${errors.join(',')}`));

        // the data source might need to run encryption of configurations or cleanup
        // operations prior to saving the record - always call the interfaces ToSave
        // method
        const toSave = await t.ToSave();
        let savedRecord: DataSourceRecord;

        if (toSave.id) {
            // check for unique source name within container scope
            const sources = await new DataSourceRepository().where().containerID('eq', toSave.container_id).and().id('neq', toSave.id).list();
            if (sources.isError) return Promise.resolve(Result.Failure(`unable to list data sources for container ${sources.error}`));

            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(toSave.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            const originalToSave = await original.value.ToSave();

            Object.assign(originalToSave, toSave);

            const updated = await this.#mapper.Update(user.id!, originalToSave);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            savedRecord = updated.value;
        } else {
            // check for unique source name within container scope
            const sources = await new DataSourceRepository().where().containerID('eq', toSave.container_id).list();
            if (sources.isError) return Promise.resolve(Result.Failure(`unable to list data sources for container ${sources.error}`));

            // we need a transaction so that a hypertable failure can delete data source as well
            const transaction = await this.#mapper.startTransaction();

            const created = await this.#mapper.Create(user.id!, toSave, transaction.value);
            if (created.isError) return Promise.resolve(Result.Pass(created));

            if (created.value.adapter_type === 'timeseries') {
                const hypertable_created = await this.#mapper.CreateHypertable(created.value);
                if (hypertable_created.isError) {
                    await this.#mapper.rollbackTransaction(transaction.value);
                    return Promise.resolve(Result.Failure(`unable to create hypertable for timeseries data source ${hypertable_created.error?.error}`));
                }
            }

            await this.#mapper.completeTransaction(transaction.value);

            savedRecord = created.value;
        }

        const newDataSource = await this.#factory.fromDataSourceRecord(savedRecord);
        if (!newDataSource) return Promise.resolve(Result.Failure(`unable to instantiate new data source from saved data source record`));

        Object.assign(t, newDataSource);

        return Promise.resolve(Result.Success(true));
    }

    // attempts to create a new data source and returns the newly created data source
    async createDataSource(t: DataSource, user: User): Promise<Result<DataSource>> {
        if (!t.DataSourceRecord) return Promise.resolve(Result.Failure(`Data Source must have a data source record instantiated`));

        const errors = await t.DataSourceRecord.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`attached data source record does not pass validation ${errors.join(',')}`));

        const toSave = await t.ToSave();
        let savedRecord: DataSourceRecord;

        if (toSave.id) {
            // check for unique source name within container scope
            const sources = await new DataSourceRepository().where().containerID('eq', toSave.container_id).and().id('neq', toSave.id).list();
            if (sources.isError) return Promise.resolve(Result.Failure(`unable to list data sources for container ${sources.error}`));

            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(toSave.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            const originalToSave = await original.value.ToSave();

            Object.assign(originalToSave, toSave);

            const updated = await this.#mapper.Update(user.id!, originalToSave);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            savedRecord = updated.value;
        } else {
            // check for unique source name within container scope
            const sources = await new DataSourceRepository().where().containerID('eq', toSave.container_id).list();
            if (sources.isError) return Promise.resolve(Result.Failure(`unable to list data sources for container ${sources.error}`));

            // we need a transaction so that a hypertable failure can delete data source as well
            const transaction = await this.#mapper.startTransaction();

            const created = await this.#mapper.Create(user.id!, toSave, transaction.value);
            if (created.isError) return Promise.resolve(Result.Pass(created));

            if (created.value.adapter_type === 'timeseries') {
                const hypertable_created = await this.#mapper.CreateHypertable(created.value);
                if (hypertable_created.isError) {
                    await this.#mapper.rollbackTransaction(transaction.value);
                    return Promise.resolve(Result.Failure(`unable to create hypertable for timeseries data source ${hypertable_created.error?.error}`));
                }
            }

            await this.#mapper.completeTransaction(transaction.value);

            savedRecord = created.value;
        }

        const newDataSource = await this.#factory.fromDataSourceRecord(savedRecord);
        if (!newDataSource) return Promise.resolve(Result.Failure(`unable to instantiate new data source from saved data source record`));

        Object.assign(t, newDataSource);

        return Promise.resolve(Result.Success(newDataSource));
    }

    async importDataSources(containerID: string, user: User, jsonImport: any): Promise<Result<Map<string, string>>> {
        // declare the return object which will be a map of the incoming data source id and existing or new data source id
        const sourceIDMapping: Map<string, string> = new Map();

        if (!('data_sources' in jsonImport)) {
            return Promise.resolve(Result.Failure('Container export file does not contain all necessary sections for a data source export.'));
        }

        const currentDataSources = await this.where().containerID('eq', containerID).list();

        for (const source of jsonImport.data_sources) {
            if (!source.DataSourceRecord) {
                return Promise.resolve(Result.Failure('Data source provided in import with invalid format. Please review.'));
            }

            // grab the old ID from the data source record to make mappings that include data sources easier to process
            const oldID = source.DataSourceRecord.id!;

            const dataSourceRecord = plainToClass(DataSourceRecord, source.DataSourceRecord as object);

            const dataSource = await this.#factory.fromDataSourceRecord(dataSourceRecord);
            if (!dataSource || !dataSource.DataSourceRecord) {
                return Promise.resolve(Result.Failure('Unknown data source adapter type provided in export file.'));
            }

            const existingDataSource = currentDataSources.value.find((ds) => ds?.DataSourceRecord?.name === dataSource.DataSourceRecord!.name);
            if (existingDataSource) {
                dataSource.DataSourceRecord.id = existingDataSource.DataSourceRecord?.id;
                sourceIDMapping.set(source.DataSourceRecord.id, existingDataSource.DataSourceRecord?.id!);
            } else {
                dataSource.DataSourceRecord.id = undefined;
            }

            // set old_id on the new DataSourceRecord
            dataSource.DataSourceRecord.old_id = oldID;
            dataSource.DataSourceRecord.container_id = containerID;
            dataSource.DataSourceRecord.active = false;

            const newDataSource = await this.createDataSource(dataSource, user);
            if (newDataSource.isError) return Promise.resolve(Result.Failure('Unable to save data source'));

            sourceIDMapping.set(source.DataSourceRecord.id, newDataSource.value.DataSourceRecord?.id!);
        }

        return Promise.resolve(Result.Success(sourceIDMapping));
    }

    // setting a data source to inactive will automatically stop the process loop
    async setInactive(t: DataSource, user: User): Promise<Result<boolean>> {
        if (t.DataSourceRecord && t.DataSourceRecord.id) {
            return this.#mapper.SetInactive(t.DataSourceRecord.id, user.id!);
        } else return Promise.resolve(Result.Failure(`data source's record must be instantiated and have an id`));
    }

    // do not start the process loop when setting to active, the worker will pick up the change automatically
    async setActive(t: DataSource, user: User): Promise<Result<boolean>> {
        if (t.DataSourceRecord && t.DataSourceRecord.id) {
            const set = await this.#mapper.SetActive(t.DataSourceRecord.id, user.id!);
            if (set.isError) return Promise.resolve(Result.Pass(set));

            return Promise.resolve(Result.Success(true));
        } else return Promise.resolve(Result.Failure(`data source's record must be instantiated and have an id`));
    }

    async setStatus(
        t: DataSource,
        user: User,
        status: 'ready' | 'polling' | 'error',
        status_message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        if (t.DataSourceRecord && t.DataSourceRecord.id) {
            return this.#mapper.SetStatus(t.DataSourceRecord.id, user.id!, status, status_message, transaction);
        } else return Promise.resolve(Result.Failure(`data source's record must be instantiated and have an id`));
    }

    async reprocess(containerID: string, dataSourceID: string): Promise<Result<boolean>> {
        // reprocess each import associated with this data source from oldest to newest
        const imports = await this.#importRepo.where().dataSourceID('eq', dataSourceID).list({sortBy: 'created_at'});
        if (!imports.isError) {
            imports.value.forEach((i) => {
                void this.#importRepo.reprocess(containerID, i.id!);
            });
        }

        return Promise.resolve(Result.Success(true));
    }

    constructor() {
        super(DataSourceMapper.tableName);
    }

    // filter specific functions
    id(operator: string, value: any) {
        super.query('id', operator, value);
        return this;
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
        return this;
    }

    adapter_type(operator: string, value: any) {
        super.query('adapter_type', operator, value);
        return this;
    }

    active() {
        super.query('active', 'eq', true);
        return this;
    }

    archived(value: boolean) {
        super.query('archived', 'eq', value);
        return this;
    }

    oldID(operator:string, value: any) {
        super.query('old_id', operator, value);
        return this;
    }

    timeseries(value: boolean) {
        super.query('adapter_type', value ? 'in' : 'not in', 'timeseries,timeseries_bucket');
        return this;
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<(DataSource | undefined)[]>> {
        const results = await super.findAll<DataSourceRecord>(options, {
            transaction,
            resultClass: DataSourceRecord,
        });
        if (results.isError) return Promise.resolve(Result.Pass(results));

        return Promise.resolve(Result.Success(await Promise.all(results.value.map(async (record) => await this.#factory.fromDataSourceRecord(record)))));
    }

    async listForExport(containerID: string, options?: QueryOptions, transaction?: PoolClient): Promise<Result<(DataSource | undefined)[]>> {
        const results = await this.where().containerID('eq', containerID).and().archived(false).list(options, transaction);

        const dataSources = results.value.map((source) => {
            return source?.ToExport()!;
        });

        const dsResults = await Promise.all(dataSources);

        return Promise.resolve(Result.Success(await Promise.all(dsResults.map(async (record) => await this.#factory.fromDataSourceRecord(record)))));
    }

    // you will see errors chaining this method with any of the query functions except timeseries query. I debated throwing
    // this into its own repository like last time, but it didn't make sense
    async listTimeseries(dataSourceID: string, options?: QueryOptions, transaction?: PoolClient): Promise<Result<any[]>> {
        // we have to hijack the top of the query to point to the proper table
        if (options?.distinct) {
            // clear the base select and override with custom values
            this._noSelectRoot();
            this._query.SELECT = [`SELECT DISTINCT y_${dataSourceID}.*`];
            this._query.FROM = `FROM y_${dataSourceID}`;
        } else {
            this._noSelectRoot();
            this._query.SELECT = [`SELECT y_${dataSourceID}.*`];
            this._query.FROM = `FROM y_${dataSourceID}`;
        }

        if (options && options.groupBy && this.#groupBy) {
            options.groupBy = [options.groupBy, ...this.#groupBy].join(',');
        } else if (options && this.#groupBy) {
            options.groupBy = this.#groupBy.join(',');
        } else if (this.#groupBy) {
            options = {groupBy: this.#groupBy.join(',')};
        }

        return super.findAll<any>(options, {
            transaction,
        });
    }

    async listTimeseriesToFile(dataSourceID: string, fileOptions: FileOptions, options?: QueryOptions, transaction?: PoolClient): Promise<Result<File>> {
        // we have to hijack the top of the query to point to the proper table
        if (options?.distinct) {
            // clear the base select and override with custom values
            this._noSelectRoot();
            this._query.SELECT = [`SELECT DISTINCT y_${dataSourceID}.*`];
            this._query.FROM = `FROM y_${dataSourceID}`;
        } else {
            this._noSelectRoot();
            this._query.SELECT = [`SELECT y_${dataSourceID}.*`];
            this._query.FROM = `FROM y_${dataSourceID}`;
        }

        if (options && options.groupBy && this.#groupBy) {
            options.groupBy = [options.groupBy, ...this.#groupBy].join(',');
        } else if (options && this.#groupBy) {
            options.groupBy = this.#groupBy.join(',');
        } else if (this.#groupBy) {
            options = {groupBy: this.#groupBy.join(',')};
        }

        return super.findAllToFile(fileOptions, options, {
            transaction,
        });
    }

    async retrieveTimeseriesRowCount(tableName: string): Promise<Result<number>> {
        return this.#mapper.retrieveTimeseriesRowCount(tableName);
    }

    async retrieveTimeseriesRange(primaryTimestamp: string, tableName: string): Promise<Result<TimeseriesRange>> {
        return this.#mapper.retrieveTimeseriesRange(primaryTimestamp, tableName);
    }
}

// as part of the data source repository we also include the Data Source factory, used
// to take data source records and generate data source interfaces from them.
export class DataSourceFactory {
    async fromDataSourceRecord(
        sourceRecord: DataSourceRecord,
    ): Promise<
        StandardDataSourceImpl | HttpDataSourceImpl | AvevaDataSourceImpl | TimeseriesDataSourceImpl | P6DataSourceImpl | CustomDataSourceImpl | undefined
    > {
        switch (sourceRecord.adapter_type) {
            case 'http': {
                return Promise.resolve(new HttpDataSourceImpl(sourceRecord));
            }

            case 'standard': {
                return Promise.resolve(new StandardDataSourceImpl(sourceRecord));
            }

            case 'manual': {
                // this is to handle backwards compatibility with already existing records
                return Promise.resolve(new StandardDataSourceImpl(sourceRecord));
            }

            case 'aveva': {
                return Promise.resolve(new AvevaDataSourceImpl(sourceRecord));
            }

            case 'p6': {
                return Promise.resolve(new P6DataSourceImpl(sourceRecord));
            }

            case 'custom': {
                return Promise.resolve(new CustomDataSourceImpl(sourceRecord));
            }

            case 'timeseries': {
                return Promise.resolve(new TimeseriesDataSourceImpl(sourceRecord));
            }

            default: {
                return undefined;
            }
        }
    }
}
