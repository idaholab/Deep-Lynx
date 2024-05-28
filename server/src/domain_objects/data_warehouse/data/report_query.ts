import { BaseDomainClass } from "../../../common_classes/base_domain_class";
import {IsOptional, IsString} from 'class-validator';
import Report from './report';

/*
    ReportQuery represents a query and its execution status. Queries can
    be attached to a report or be executed independent of a report.
*/
export default class ReportQuery extends BaseDomainClass{
    @IsOptional()
    @IsString()
    id?: string;

    @IsOptional()
    @IsString()
    report_id?: string;

    @IsString()
    query?: string;

    @IsString()
    status: 'ready' | 'processing' | 'error' | 'completed' = 'ready';

    @IsString()
    status_message?: string;

    constructor(input: {
        report_id?: Report | string;
        query: string;
        status_message: string;
    }) {
        super();
        if (input) {
            if (input.report_id) {
                input.report_id instanceof Report ? (this.report_id = input.report_id.id) : (this.report_id = input.report_id);
            }
            this.query = input.query;
            if (input.status_message) { this.status_message = input.status_message};
        }
    }
}