import {BaseDomainClass} from '../../common_classes/base_domain_class';
import {IsIn, IsObject, IsOptional, IsString} from 'class-validator';
import DataSourceRepository from '../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import logger from '../../services/logger';

/*
    Event represents an event record in the Deep Lynx database and the various
    validations required for said record to be considered valid.
 */
export default class Event extends BaseDomainClass {
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

    event_config?: any;

    @IsObject()
    event?: object;

    constructor(input: {containerID?: string; dataSourceID?: string; eventType: string; eventConfig?: any, event: object}) {
        super();

        if (input) {
            if (input.containerID) this.container_id = input.containerID;
            if (input.dataSourceID) {
                this.data_source_id = input.dataSourceID;

                // populate the containerID if not provided
                if (!input.containerID) {

                    new DataSourceRepository().findByID(input.dataSourceID).then((dataSource) => {
                        this.container_id = dataSource.value.DataSourceRecord?.container_id;
                    }).catch((e) => {
                        logger.debug(e)
                    })

                }
            }
            this.event_type = input.eventType;

            if (input.eventConfig) this.event_config = input.eventConfig;
            this.event = input.event;
        }
    }
}
