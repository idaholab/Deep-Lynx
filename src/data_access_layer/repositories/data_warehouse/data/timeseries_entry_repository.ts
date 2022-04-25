import {Repository} from '../../repository';
import TimeseriesEntry from '../../../../domain_objects/data_warehouse/data/timeseries';
import {PoolClient} from 'pg';
import Result from '../../../../common_classes/result';
import TimeseriesEntryMapper from '../../../mappers/data_warehouse/data/timeseries_entry_mapper';

export default class TimeseriesEntryRepository extends Repository {
    #mapper: TimeseriesEntryMapper = TimeseriesEntryMapper.Instance;

    constructor() {
        super('');
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
}
