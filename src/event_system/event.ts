import {BaseDomainClass} from "../base_domain_class";
import {IsIn, IsObject, IsString} from "class-validator";

export default class Event extends BaseDomainClass {
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
        'data_exported'
    ])
    type?: string

    @IsString()
    source_id?: string

    @IsString()
    @IsIn(["data_source", "container"])
    source_type?: string

    @IsObject()
    data?: any

    constructor(input: {
        sourceID: string,
        sourceType: string,
        type?: string,
        data?: any
    }) {
        super();

        if(input) {
            if(input.type) this.type = input.type
            if(input.data) this.data = input.data
            this.source_id = input.sourceID
            this.source_type = input.sourceType
        }
    }
}

