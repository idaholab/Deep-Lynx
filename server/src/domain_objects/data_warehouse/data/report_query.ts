import { BaseDomainClass } from "../../../common_classes/base_domain_class";
import {IsArray, IsOptional, IsString} from 'class-validator';
import Report from './report';

/*
    ReportQuery represents a query and its execution status.
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
        status_message?: string;
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

// initial object used to create request for the timeseries rust module
export class TimeseriesInitialRequest {
    @IsOptional()
    @IsString()
    report_id?: string;

    @IsOptional()
    @IsString()
    query?: string;

    @IsArray()
    file_ids?: string[];

    constructor(input: {report_id?: string, query?: string, file_ids?: string[]}) {
        if (input) {
            if (input.report_id) {this.report_id = input.report_id}
            if (input.query) {this.query = input.query}
            this.file_ids = input.file_ids
        }
    }
}