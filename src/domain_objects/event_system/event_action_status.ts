import {BaseDomainClass} from '../../common_classes/base_domain_class';
import {IsOptional, IsString} from 'class-validator';

/*
    EventActionStatus represents an event action status record in the Deep Lynx
    database and the various validations required for said record to be considered valid.
 */
export default class EventActionStatus extends BaseDomainClass {
    @IsOptional()
    id?: string;

    @IsOptional()
    event?: any;

    @IsString()
    @IsOptional()
    event_action_id?: string;

    @IsString()
    status = 'sent';

    @IsString()
    @IsOptional()
    status_message?: string;

    constructor(input: {eventActionID?: string; event?: any; status?: string; statusMessage?: string}) {
        super();

        if (input) {
            if (input.eventActionID) this.event_action_id = input.eventActionID;
            if (input.event) this.event = input.event;
            if (input.status) this.status = input.status;
            if (input.statusMessage) this.status_message = input.statusMessage;
        }
    }
}
