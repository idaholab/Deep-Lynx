import {Readable} from 'stream';
import {User} from '../../../domain_objects/access_management/user';
import Result from '../../../common_classes/result';
import Import, {DataStaging} from '../../../domain_objects/data_warehouse/import/import';
import {ReceiveDataOptions} from '../../../domain_objects/data_warehouse/import/data_source';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';

/*
    The DataSource interface represents basic functionality of a data source. All
    data sources must be able to receive and process received information.
 */
export interface DataSource {
    DataSourceRecord?: DataSourceRecord;

    // ReceiveData accepts a Readable stream whose origin data is an array of JSON objects. JSONStream will handle
    // parsing this data into valid javascript objects. If your origin data is not valid JSON then you must pass
    // in one or more valid Transform stream types to convert your origin data into valid JSON prior to parsing.
    // If your stream is already valid javascript objects, or you don't need parsing - override the JSON stream.
    // This function should return the import record the data is stored under - optionally you can pass an
    // import that already exists in case you are adding data to it. This is not best practice
    // because you might be adding records to an import which isn't the latest, potentially overwriting
    // newer data when the data source attempts to process it
    ReceiveData(payload: Readable, user: User, options?: ReceiveDataOptions): Promise<Result<Import | DataStaging[]>>;

    // Run will initiate any data source specific operations such as polling - this
    // should fire a one time function, not a perpetual function
    Run(): Promise<void>;

    // this final method is so that the data source can run any encryption or source
    // specific functions prior to the data source record being saved into the database
    ToSave(): Promise<DataSourceRecord>;
}
