import StandardDataSourceImpl from './standard_data_source_impl';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';
import {DataSource} from './data_source';

export default class AvevaDataSourceImpl extends StandardDataSourceImpl implements DataSource {
    constructor(record: DataSourceRecord) {
        super(record);
    }
}
