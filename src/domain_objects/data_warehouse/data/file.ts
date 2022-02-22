import {BaseDomainClass, NakedDomainClass} from '../../../common_classes/base_domain_class';
import {IsIn, IsNumber, IsObject, IsOptional, IsString} from 'class-validator';

/*
    File represents a file record in the Deep Lynx database and the various
    validations required for said record to be considered valid.
 */
export default class File extends BaseDomainClass {
    @IsOptional()
    id?: string;

    @IsString()
    container_id?: string;

    @IsString()
    @IsOptional()
    data_source_id?: string;

    @IsString()
    file_name?: string;

    @IsNumber()
    file_size?: number;

    @IsString()
    @IsOptional()
    md5hash?: string;

    @IsString()
    adapter_file_path?: string;

    @IsString()
    @IsIn(['filesystem', 'azure_blob', 'mock', 'largeobject'])
    adapter?: string;

    @IsObject()
    @IsOptional()
    metadata: object = {};

    constructor(input: {
        container_id: string;
        data_source_id?: string;
        file_name: string;
        file_size: number;
        md5hash?: string;
        adapter_file_path: string;
        adapter: string;
        metadata?: object;
    }) {
        super();

        if (input) {
            this.container_id = input.container_id;
            if (input.data_source_id) this.data_source_id = input.data_source_id;
            this.file_name = input.file_name;
            this.file_size = input.file_size;
            if (input.md5hash) this.md5hash = input.md5hash;
            this.adapter_file_path = input.adapter_file_path;
            this.adapter = input.adapter;
            if (input.metadata) this.metadata = input.metadata;
        }
    }
}

// Utility classes needed when attaching/detaching files to data staging, node, and edge records
export class DataStagingFile extends NakedDomainClass {
    @IsString()
    data_staging_id?: string;

    @IsString()
    file_id?: string;

    constructor(input: {data_staging_id: string; file_id: string}) {
        super();

        if (input) {
            this.data_staging_id = input.data_staging_id;
            this.file_id = input.file_id;
        }
    }
}

export class NodeFile extends NakedDomainClass {
    @IsString()
    node_id?: string;

    @IsString()
    file_id?: string;

    constructor(input: {node_id: string; file_id: string}) {
        super();

        if (input) {
            this.node_id = input.node_id;
            this.file_id = input.file_id;
        }
    }
}

export class EdgeFile extends NakedDomainClass {
    @IsString()
    edge_id?: string;

    @IsString()
    file_id?: string;

    constructor(input: {edge_id: string; file_id: string}) {
        super();

        if (input) {
            this.edge_id = input.edge_id;
            this.file_id = input.file_id;
        }
    }
}
