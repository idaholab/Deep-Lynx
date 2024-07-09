import { BaseDomainClass, NakedDomainClass } from "../../../common_classes/base_domain_class";
import {IsArray, IsBoolean, IsOptional, IsString} from 'class-validator';
import Report from './report';
import { FilePathMetadata } from "./file";

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

// initial object used to create request for the TS2 rust module
export class TS2InitialRequest {
    @IsOptional()
    @IsString()
    report_id?: string;

    @IsString()
    query?: string;

    @IsArray()
    file_ids?: string[];

    constructor(input: {report_id?: string, query?: string, file_ids?: string[]}) {
        if (input) {
            if (input.report_id) {this.report_id = input.report_id}
            this.query = input.query
            this.file_ids = input.file_ids
        }
    }
}

// fully fledged request which will be sent to the TS2 rust module
export class TS2Request extends NakedDomainClass {
    @IsString()
    report_id?: string;

    @IsString()
    query_id?: string;

    @IsString()
    query?: string;

    // where to upload the query results
    @IsString()
    response_url?: string;

    // metadata of files to query
    @IsArray()
    files?: FilePathMetadata[];

    // access token to upload query results
    @IsString()
    token?: string;

    @IsString()
    data_source_id?: string;

    constructor(input: {
        report_id: Report | string;
        query_id: string;
        query: string;
        response_url: string;
        files: FilePathMetadata[];
        token: string;
        data_source_id: string;
    }) {
        super();

        if (input) {
            this.report_id = input.report_id instanceof Report
                ? input.report_id.id
                : input.report_id;
            this.query_id = input.query_id;
            this.query = input.query;
            this.response_url = input.response_url;
            this.files = input.files;
            this.token = input.token;
            this.data_source_id = input.data_source_id;
        }
    }
}

// the initial response object from the TS2 rust module that query is being processed 
// TODO: this may not be needed
export class TS2Response {
    @IsString()
    reportID?: string;

    @IsOptional()
    @IsBoolean()
    isError?: boolean;

    @IsOptional()
    @IsString()
    results?: string;

    constructor(input: {reportID?: string, error?: boolean, message?: string}) {
        if (input) {
            if (input.reportID) {this.reportID = input.reportID}
            if (input.error) {this.isError = input.error}
            if (input.message) {this.results = input.message}
        }
    }
}