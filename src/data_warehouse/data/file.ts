import {BaseDomainClass} from "../../common_classes/base_domain_class";
import {IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID} from "class-validator";

/*
    File represents a file record in the Deep Lynx database and the various
    validations required for said record to be considered valid.
 */
export default class File extends BaseDomainClass {
    @IsOptional()
    @IsUUID()
    id?: string

    @IsUUID()
    container_id?: string

    @IsUUID()
    @IsOptional()
    data_source_id?: string

    @IsString()
    file_name?: string

    @IsNumber()
    file_size?: number

    @IsString()
    @IsOptional()
    md5hash?: string

    @IsString()
    adapter_file_path?: string

    @IsString()
    @IsIn(['filesystem', 'azure_blob', 'mock'])
    adapter?: string

    @IsObject()
    @IsOptional()
    metadata: object = {}

    constructor(input:{
        container_id: string,
        data_source_id?: string,
        file_name: string,
        file_size: number,
        md5hash?: string,
        adapter_file_path: string,
        adapter: string,
        metadata?: object
    }) {
        super();

        if(input) {
            this.container_id = input.container_id
            if(input.data_source_id) this.data_source_id = input.data_source_id
            this.file_name = input.file_name
            this.file_size = input.file_size
            if(input.md5hash) this.md5hash = input.md5hash
            this.adapter_file_path = input.adapter_file_path
            this.adapter = input.adapter
            if(input.metadata) this.metadata = input.metadata
        }
    }
}
