import Result from '../../../common_classes/result';
import DataTargetRecord from '../../../domain_objects/data_warehouse/export/data_target';

/*
    The DataTarget interface represents basic functionality of a data target. All
    data targets must be able to receive and process received information.
 */
export interface DataTarget {
    DataTargetRecord?: DataTargetRecord;

    // Run will initiate any data target specific operations such as polling - this
    // should fire a one time function, not a perpetual function
    Run(): Promise<void>;

    // this method is so that the data target can run any encryption or target
    // specific functions prior to the data target record being saved into the database
    ToSave(): Promise<DataTargetRecord>;
}