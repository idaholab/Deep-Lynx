import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import Import from '../../../../domain_objects/data_warehouse/import/import';
import Result from '../../../../common_classes/result';
import ImportMapper from '../../../mappers/data_warehouse/import/import_mapper';
import {PoolClient} from 'pg';
import {User} from '../../../../domain_objects/access_management/user';

/*
    Import contains methods for persisting and retrieving an import
    to storage. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning.
 */
export default class ImportRepository extends Repository implements RepositoryInterface<Import> {
    #mapper = ImportMapper.Instance;
    delete(t: Import): Promise<Result<boolean>> {
        if (t.id) {
            return this.#mapper.Delete(t.id);
        }

        return Promise.resolve(Result.Failure(`import must have id`));
    }

    findByID(id: string, transaction?: PoolClient): Promise<Result<Import>> {
        return this.#mapper.Retrieve(id, transaction);
    }

    // locking is only done in the context of a transaction, so one must be included
    findByIDAndLock(id: string, transaction: PoolClient): Promise<Result<Import>> {
        return this.#mapper.RetrieveAndLock(id, transaction);
    }

    // locking is only done in the context of a transaction, so one must be included
    findLastAndLock(dataSourceID: string, transaction: PoolClient): Promise<Result<Import>> {
        return this.#mapper.RetrieveLastAndLock(dataSourceID, transaction);
    }

    findLast(dataSourceID: string): Promise<Result<Import>> {
        return this.#mapper.RetrieveLast(dataSourceID);
    }

    setStatus(
        importID: string,
        status: 'ready' | 'processing' | 'error' | 'stopped' | 'completed',
        message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        return this.#mapper.SetStatus(importID, status, message, transaction);
    }

    setStart(start: Date, importID: string): Promise<Result<boolean>> {
        return this.#mapper.SetProcessStart(start, importID);
    }

    setEnd(end: Date, importID: string): Promise<Result<boolean>> {
        return this.#mapper.SetProcessEnd(end, importID);
    }

    // We do NOT allow updates on an import, too much room for error
    async save(importRecord: Import, user: User): Promise<Result<boolean>> {
        const errors = await importRecord.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`import does not pass validation ${errors.join(',')}`));

        if (importRecord.id) {
            return Promise.resolve(Result.Failure(`updates are not allowed on an import that has already been created`));
        } else {
            const created = await this.#mapper.CreateImport(user.id!, importRecord);
            if (created.isError) return Promise.resolve(Result.Pass(created));

            Object.assign(importRecord, created.value);
        }

        return Promise.resolve(Result.Success(true));
    }

    constructor() {
        super(ImportMapper.tableName);

        // in order to select the composite fields we must redo the initial query
        this._query.SELECT = [
            `${this._tableAlias}.*,
            SUM(CASE WHEN (data_staging.errors IS NOT NULL 
                AND data_staging.errors != '{}') 
                AND data_staging.import_id = ${this._tableAlias}.id 
                THEN 1 ELSE 0 END) AS total_errors,
            SUM(CASE WHEN data_staging.inserted_at IS NOT NULL 
                AND data_staging.import_id = ${this._tableAlias}.id 
                THEN 1 ELSE 0 END) AS records_inserted,
            SUM(CASE WHEN data_staging.import_id = ${this._tableAlias}.id 
                THEN 1 ELSE 0 END) as total_records`,
        ];
        this._query.FROM = `FROM imports ${this._tableAlias} 
            LEFT JOIN data_staging ON data_staging.import_id = ${this._tableAlias}.id`;
    }

    reprocess(importID: string): Promise<Result<boolean>> {
        return this.#mapper.ReprocessImport(importID);
    }

    dataSourceID(operator: string, value: any) {
        super.query('data_source_id', operator, value);
        return this;
    }

    status(operator: string, value: 'ready' | 'processing' | 'error' | 'stopped' | 'completed') {
        super.query('status', operator, value);
        return this;
    }

    async count(transaction?: PoolClient, queryOptions?: QueryOptions): Promise<Result<number>> {
        const results = await super.count(transaction, queryOptions);

        // in order to select the composite fields we must redo the initial query
        this._query.SELECT = [
            `${this._tableAlias}.*`,
            `SUM(CASE WHEN data_staging.inserted_at IS NOT NULL 
                AND data_staging.import_id = ${this._tableAlias}.id 
                THEN 1 ELSE 0 END) AS records_inserted`,
            `SUM(CASE WHEN data_staging.import_id = ${this._tableAlias}.id 
                THEN 1 ELSE 0 END) as total_records`,
        ];
        this._query.FROM = `FROM imports ${this._tableAlias} 
            LEFT JOIN data_staging ON data_staging.import_id = ${this._tableAlias}.id`;

        return Promise.resolve(Result.Pass(results));
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<Import[]>> {
        if (options) options.groupBy = `${this._tableAlias}.id`;

        const results = await super.findAll<Import>(options, {
            transaction,
            resultClass: Import,
        });
        // in order to select the composite fields we must redo the initial query
        this._query.SELECT = [
            `${this._tableAlias}.*`,
            `SUM(CASE WHEN data_staging.inserted_at IS NOT NULL 
                AND data_staging.import_id = ${this._tableAlias}.id 
                THEN 1 ELSE 0 END) AS records_inserted`,
            `SUM(CASE WHEN data_staging.import_id = ${this._tableAlias}.id 
                THEN 1 ELSE 0 END) as total_records`,
        ];
        this._query.FROM = `FROM imports ${this._tableAlias} 
            LEFT JOIN data_staging ON data_staging.import_id = ${this._tableAlias}.id`;

        return Promise.resolve(Result.Pass(results));
    }
}
