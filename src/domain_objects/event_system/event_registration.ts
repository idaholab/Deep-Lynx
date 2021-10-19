import {BaseDomainClass} from '../../common_classes/base_domain_class';
import {IsBoolean, IsIn, IsOptional, IsString, IsUUID} from 'class-validator';

/*
    EventRegistration represents an event registration record in the Deep Lynx
    database and the various validations required for said record to be considered valid.
 */
export default class EventRegistration extends BaseDomainClass {
    @IsOptional()
    id?: string;

    @IsString()
    @IsOptional()
    data_source_id?: string;

    @IsString()
    @IsOptional()
    container_id?: string;

    @IsBoolean()
    active = true;

    @IsString()
    app_name?: string;

    @IsString()
    app_url?: string;

    @IsString()
    @IsIn([
        'data_imported',
        'data_ingested',
        'type_mapping_created',
        'type_mapping_modified',
        'file_created',
        'file_modified',
        'data_source_created',
        'data_source_modified',
        'data_exported',
    ])
    event_type?: string;

    constructor(input: {appName: string; appUrl: string; dataSourceID?: string; containerID?: string; active?: boolean; eventType?: string}) {
        super();

        if (input) {
            if (input.dataSourceID) this.data_source_id = input.dataSourceID;
            if (input.containerID) this.container_id = input.containerID;
            if (input.active) this.active = input.active;
            if (input.eventType) this.event_type = input.eventType;
            this.app_name = input.appName;
            this.app_url = input.appUrl;
        }
    }
}
