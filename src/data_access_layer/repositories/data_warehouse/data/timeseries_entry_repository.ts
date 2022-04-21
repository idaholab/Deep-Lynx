import {Repository} from '../../repository';
import TimeseriesEntry from '../../../../domain_objects/data_warehouse/data/timeseries';
import {PoolClient} from 'pg';
import Result from '../../../../common_classes/result';
import TimeseriesEntryMapper from '../../../mappers/data_warehouse/data/timeseries_entry_mapper';

export default class TimeseriesEntryRepository extends Repository {
    #mapper: TimeseriesEntryMapper = TimeseriesEntryMapper.Instance;

    async bulkSave(entries: TimeseriesEntry[], transaction?: PoolClient): Promise<Result<boolean>> {
        return this.#mapper.BulkCreate(entries, transaction);
    }
}
