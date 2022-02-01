import RepositoryInterface, {DeleteOptions, QueryOptions, Repository} from '../../repository';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import DataSourceMapper from '../../../mappers/data_warehouse/import/data_source_mapper';
import HttpDataSourceImpl from '../../../../interfaces_and_impl/data_warehouse/import/http_data_source_impl';
import StandardDataSourceImpl from '../../../../interfaces_and_impl/data_warehouse/import/standard_data_source_impl';
import Result from '../../../../common_classes/result';
import {User} from '../../../../domain_objects/access_management/user';
import {PoolClient} from 'pg';
import ImportMapper from '../../../mappers/data_warehouse/import/import_mapper';
import JazzDataSourceImpl from '../../../../interfaces_and_impl/data_warehouse/import/jazz_data_source_impl';
import AvevaDataSourceImpl from '../../../../interfaces_and_impl/data_warehouse/import/aveva_data_source';
import {DataSource} from '../../../../interfaces_and_impl/data_warehouse/import/data_source';

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
    #factory = new DataSourceFactory();

    async delete(t: DataSource, options?: DeleteOptions): Promise<Result<boolean>> {
        if (!t.DataSourceRecord || !t.DataSourceRecord.id)
            return Promise.resolve(Result.Failure(`cannot delete data source: no data source record or record lacking id`));

        const hasImports = await ImportMapper.Instance.ExistForDataSource(t.DataSourceRecord.id);

        if (options) {
            if (!hasImports || (options.force && options.removeData)) return this.#mapper.DeleteWithData(t.DataSourceRecord.id);
            else if (!hasImports || options.force) return this.#mapper.Delete(t.DataSourceRecord.id);
        } else {
            if (!hasImports) return this.#mapper.Delete(t.DataSourceRecord.id);
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

        const dataSource = this.#factory.fromDataSourceRecord(dataSourceRecord.value);
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
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(toSave.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            const originalToSave = await original.value.ToSave();

            Object.assign(originalToSave, toSave);

            const updated = await this.#mapper.Update(user.id!, originalToSave);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            savedRecord = updated.value;
        } else {
            const created = await this.#mapper.Create(user.id!, toSave);
            if (created.isError) return Promise.resolve(Result.Pass(created));

            savedRecord = created.value;
        }

        const newDataSource = this.#factory.fromDataSourceRecord(savedRecord);
        if (!newDataSource) return Promise.resolve(Result.Failure(`unable to instantiate new data source from saved data source record`));

        Object.assign(t, newDataSource);

        return Promise.resolve(Result.Success(true));
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

    active() {
        super.query('active', 'eq', true);
        return this;
    }

    archived(value: boolean) {
        super.query('archived', 'eq', value);
        return this;
    }

    inactive() {
        super.query('active', 'eq', false);
        return this;
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<(DataSource | undefined)[]>> {
        const results = await super.findAll<DataSourceRecord>(options, {
            transaction,
            resultClass: DataSourceRecord,
        });
        if (results.isError) return Promise.resolve(Result.Pass(results));

        return Promise.resolve(Result.Success(results.value.map((record) => this.#factory.fromDataSourceRecord(record))));
    }
}

// as part of the data source repository we also include the Data Source factory, used
// to take data source records and generate data source interfaces from them. Currently
// the only implementations are the Http and Standard data sources.
export class DataSourceFactory {
    fromDataSourceRecord(sourceRecord: DataSourceRecord): StandardDataSourceImpl | HttpDataSourceImpl | JazzDataSourceImpl | AvevaDataSourceImpl | undefined {
        switch (sourceRecord.adapter_type) {
            case 'http': {
                return new HttpDataSourceImpl(sourceRecord);
            }

            case 'standard': {
                return new StandardDataSourceImpl(sourceRecord);
            }

            case 'manual': {
                // this is to handle backwards compatibility with already existing records
                return new StandardDataSourceImpl(sourceRecord);
            }

            case 'jazz': {
                return new JazzDataSourceImpl(sourceRecord);
            }

            case 'aveva': {
                return new AvevaDataSourceImpl(sourceRecord);
            }

            default: {
                return undefined;
            }
        }
    }
}
