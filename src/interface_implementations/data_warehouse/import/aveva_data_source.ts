import StandardDataSourceImpl from './standard_data_source_impl';
import DataSourceRecord, {DataSource} from '../../../domain_objects/data_warehouse/import/data_source';

export default class AvevaDataSourceImpl extends StandardDataSourceImpl implements DataSource {
    constructor(record: DataSourceRecord) {
        super(record);
    }
}
