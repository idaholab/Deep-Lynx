import {FileOptions, QueryOptions, Repository} from '../../repository';
import TimeseriesEntry from '../../../../domain_objects/data_warehouse/data/timeseries';
import {PoolClient} from 'pg';
import Result from '../../../../common_classes/result';
import TimeseriesEntryMapper from '../../../mappers/data_warehouse/data/timeseries_entry_mapper';
import File from '../../../../domain_objects/data_warehouse/data/file';

const format = require('pg-format');

export default class TimeseriesEntryRepository extends Repository {
    #mapper: TimeseriesEntryMapper = TimeseriesEntryMapper.Instance;
    #groupBy?: string[];

    // transformationID is optional and should only be provided if this repository is going to be used for querying a
    // timeseries table
    constructor(transformationID?: string) {
        super(transformationID ? `z_${transformationID}` : '', {
            distinct: true,
        });
    }

    async bulkSave(entries: TimeseriesEntry[], transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction = false;
        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate db transaction'));

            transaction = newTransaction.value;
            internalTransaction = true;
        }

        const validationPromises = [];
        for (const entry of entries) {
            validationPromises.push(entry.validationErrors());
        }

        const errorSets = await Promise.all(validationPromises);

        for (const errors of errorSets) {
            if (errors && errors.length > 0) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`one or more timeseries entries failed validation ${errors.join(',')}`));
            }
        }

        const created = await this.#mapper.BulkCreate(entries, transaction);
        if (created.isError && internalTransaction) {
            await this.#mapper.rollbackTransaction(transaction);
            return Promise.resolve(Result.Pass(created));
        } else if (!created.isError && internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        return Promise.resolve(Result.Success(true));
    }

    histogram(column: string, min: string | number, max: string | number, nbuckets: number, additionalColumns?: string[]) {
        let text = '';
        let values: any[] = [];
        const tableAlias = (this._aliasMap.has(this._tableName)) ? (this._aliasMap.get(this._tableName)) : (this._tableName);

        if (additionalColumns && additionalColumns.length > 0) {
            text = `SELECT ${additionalColumns.join(',')}, histogram(%s, %L::numeric, %L::numeric, %L::integer) FROM ${this._tableName} as ${tableAlias}`;
            values = [column, min, max, nbuckets];
        } else {
            text = `SELECT histogram(%s, %L::numeric, %L::numeric, %L::integer) FROM ${this._tableName} as ${tableAlias}`;
            values = [column, min, max, nbuckets];
        }

        this._query.SELECT = [format(text, ...values)];

        if (this.#groupBy && additionalColumns) {
            this.#groupBy.push(...additionalColumns);
        } else if (additionalColumns) {
            this.#groupBy = additionalColumns;
        }

        return this;
    }

    query(fieldName: string, operator: string, value?: any, conditions?: {dataType?: string}) {
        return super.query(`"${fieldName}"`, operator, value, {dataType: conditions?.dataType});
    }

    list(queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<any[]>> {
        if (queryOptions) {
            queryOptions!.tableName = this._tableName;
        } else {
            queryOptions = {tableName: this._tableName};
        }

        if (queryOptions && queryOptions.groupBy && this.#groupBy) {
            queryOptions.groupBy = [queryOptions.groupBy, ...this.#groupBy].join(',');
        } else if (queryOptions && this.#groupBy) {
            queryOptions.groupBy = this.#groupBy.join(',');
        } else if (this.#groupBy) {
            queryOptions = {groupBy: this.#groupBy.join(',')};
        }

        return super.findAll<any>(queryOptions, {transaction});
    }

    listAllToFile(fileOptions: FileOptions, queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<File>> {
        if (queryOptions) {
            queryOptions!.tableName = this._tableName;
        } else {
            queryOptions = {tableName: this._tableName};
        }

        if (queryOptions && queryOptions.groupBy && this.#groupBy) {
            queryOptions.groupBy = [queryOptions.groupBy, ...this.#groupBy].join(',');
        } else if (queryOptions && this.#groupBy) {
            queryOptions.groupBy = this.#groupBy.join(',');
        } else if (this.#groupBy) {
            queryOptions = {groupBy: this.#groupBy.join(',')};
        }

        return super.findAllToFile(fileOptions, queryOptions, {transaction});
    }
}
