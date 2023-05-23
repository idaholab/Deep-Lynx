// Class Validators
import {IsObject, IsOptional, IsString} from 'class-validator';

// Common Classes
import {BaseDomainClass, NakedDomainClass} from '../../../common_classes/base_domain_class';

// Ontology
import Container from '../ontology/container';

/*
    Tag represents a tag record in the DeepLynx database and the various
    validations required for said record to be considered valid.
 */
export default class Tag extends BaseDomainClass {
    @IsString()
    @IsOptional()
    id?: string;

    @IsString()
    tag_name?: string;

    @IsString()
    container_id?: string;

    @IsObject()
    @IsOptional()
    metadata: object = {};


    constructor(input: {
        id?: string;
        tag_name: string;
        container_id: Container | string;
        metadata?: object;
        created_at?: Date;
    }) {
        super();

        if (input) {
            if(input.id) this.id = input.id;
            this.tag_name = input.tag_name;
            input.container_id instanceof Container ? (this.container_id = input.container_id.id) : (this.container_id = input.container_id);
            if (input.metadata) this.metadata = input.metadata;
            if (input.created_at) this.created_at = input.created_at;
        }
    }
}

// Utility classes needed when attaching/detaching tags to data staging, node, edge, and file records
export class DataStagingTag extends NakedDomainClass {
    @IsString()
    data_staging_id?: string;

    @IsString()
    tag_id?: string;

    constructor(input: {data_staging_id: string; tag_id: string}) {
        super();

        if (input) {
            this.data_staging_id = input.data_staging_id;
            this.tag_id = input.tag_id;
        }
    }
}

export class NodeTag extends NakedDomainClass {
    @IsString()
    node_id?: string;

    @IsString()
    tag_id?: string;

    constructor(input: {node_id: string; tag_id: string}) {
        super();

        if (input) {
            this.node_id = input.node_id;
            this.tag_id = input.tag_id;
        }
    }
}

export class EdgeTag extends NakedDomainClass {
    @IsString()
    edge_id?: string;

    @IsString()
    tag_id?: string;

    constructor(input: {edge_id: string; tag_id: string}) {
        super();

        if (input) {
            this.edge_id = input.edge_id;
            this.tag_id = input.tag_id;
        }
    }
}

export class FileTag extends NakedDomainClass {
    @IsString()
    file_id?: string;

    @IsString()
    tag_id?: string;

    constructor(input: {file_id: string; tag_id: string}) {
        super();

        if (input) {
            this.file_id = input.file_id;
            this.tag_id = input.tag_id;
        }
    }
}