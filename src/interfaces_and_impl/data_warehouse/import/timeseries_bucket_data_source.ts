import DataSourceRecord, {ReceiveDataOptions} from '../../../domain_objects/data_warehouse/import/data_source';
import {DataSource} from './data_source';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import {Readable} from 'stream';
import {User} from '../../../domain_objects/access_management/user';
import Result from '../../../common_classes/result';
import Import from '../../../domain_objects/data_warehouse/import/import';

export default class TimeseriesBucketDataSourceImpl implements DataSource {
    DataSourceRecord?: DataSourceRecord;

    // dealing with mappers directly since we don't need validation
    #mapper = DataSourceMapper.Instance;

    constructor(record: DataSourceRecord) {
        if (record) {
            this.DataSourceRecord = record;
        }
    }

    ReceiveData(payload: Readable, user: User, options?: ReceiveDataOptions): Promise<Result<Import | boolean>> {
        return Promise.resolve(Result.Success(true));
    }

    Run(): Promise<void> {
        return Promise.resolve();
    }

    ToSave(): Promise<DataSourceRecord> {
        return Promise.resolve(this.DataSourceRecord!);
    }

    ToExport(): Promise<DataSourceRecord> {
        return Promise.resolve(this.DataSourceRecord!);
    }
}
