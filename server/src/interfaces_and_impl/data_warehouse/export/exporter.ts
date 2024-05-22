import {User} from '../../../domain_objects/access_management/user';
import Result from '../../../common_classes/result';
import ExportRecord from '../../../domain_objects/data_warehouse/export/export';

/*
 The Exporter interface allows the user to create a standard implementation
 for data export and implement it with minimum amount of work. The repository
 should always return the interface vs. the export record itself
*/
export interface Exporter {
    ExportRecord?: ExportRecord;

    Initiate(user: User): Promise<Result<boolean>>;

    Restart(user: User): Promise<Result<boolean>>;

    Stop(user: User): Promise<Result<boolean>>;

    Reset(user: User): Promise<Result<boolean>>;

    Status(): string;

    // this final method is so that the exporter can run any encryption or exporter
    // specific functions prior to the export record being saved into the database
    ToSave(): Promise<ExportRecord>;
}
