import { BaseDomainClass } from "../../../common_classes/base_domain_class";
import {IsOptional, IsString} from 'class-validator';
import Container from '../ontology/container';

/*
    ReportQuery represents a query and its execution status. Queries can
    be attached to a report or be executed independent of a report.
*/
export default class Report extends BaseDomainClass{
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    container_id?: string;

    @IsString()
    status: 'ready' | 'processing' | 'error' | 'completed' = 'ready';

    @IsString()
    status_message?: string;

    constructor(input: {
        container_id: Container | string;
        status_message?: string;
    }) {
        super();
        if (input) {
            input.container_id instanceof Container ? (this.container_id = input.container_id.id) : (this.container_id = input.container_id);
            if (input.status_message) {this.status_message = input.status_message};
        }
    }
}