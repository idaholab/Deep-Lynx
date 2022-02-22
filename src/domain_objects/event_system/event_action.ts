import {BaseDomainClass} from '../../common_classes/base_domain_class';
import {IsBoolean, IsIn, IsObject, IsOptional, IsString} from 'class-validator';

/*
    EventAction represents an event action record in the Deep Lynx
    database and the various validations required for said record to be considered valid.
 */
export default class EventAction extends BaseDomainClass {
    @IsOptional()
    id?: string;

    @IsString()
    @IsOptional()
    container_id?: string;

    @IsString()
    @IsOptional()
    data_source_id?: string;

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
        'manual'
    ])
    event_type?: string;

    @IsString()
    @IsIn([
        'default',
        'send_data',
        'email_user'
    ])
    action_type?: string = 'default';

    @IsObject()
    action_config?: object = {};

    @IsString()
    destination?: string;

    @IsString()
    @IsOptional()
    destination_data_source_id?: string;

    @IsBoolean()
    active = true;

    constructor(input: {containerID?: string; dataSourceID?: string; eventType: string, actionType?: string,
        actionConfig?: object, destination?: string, destinationDataSourceID?: string, active?: boolean;}) {
        super();

        if (input) {
            if (input.containerID) this.container_id = input.containerID;
            if (input.dataSourceID) this.data_source_id = input.dataSourceID;
            this.event_type = input.eventType;
            if (input.actionType) this.action_type = input.actionType;
            if (input.actionConfig) this.action_config = input.actionConfig;
            if (input.destination) this.destination = input.destination;
            if (input.destinationDataSourceID) this.destination_data_source_id = input.destinationDataSourceID;
            if (input.active) this.active = input.active;
        }
    }
}
