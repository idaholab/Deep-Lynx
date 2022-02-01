import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {IsArray, IsObject, IsOptional, IsString, ValidateIf, ValidateNested} from 'class-validator';
import {Expose, plainToClass, Transform, Type} from 'class-transformer';
import Metatype, {MetatypeID} from '../ontology/metatype';
import Container from '../ontology/container';
import Edge from './edge';
import {Conversion} from '../etl/type_transformation';

export class NodeMetadata {
    @IsOptional()
    @IsArray()
    @Type(() => Conversion)
    conversions: Conversion[] = [];

    @IsOptional()
    @IsArray()
    @Type(() => Conversion)
    failed_conversions: Conversion[] = [];

    constructor(input: {conversions?: Conversion[]; failed_conversions?: Conversion[]}) {
        if (input) {
            if (input.conversions) this.conversions = input.conversions;
            if (input.failed_conversions) this.failed_conversions = input.failed_conversions;
        }
    }
}

/*
    Node represents a node record in the Deep Lynx database and the various
    validations required for said record to be considered valid.
 */
export default class Node extends BaseDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    container_id?: string;

    // we often need the metatype's name, it's keys, or access to other properties
    // when we deal with nodes, so for ease of use we're going to use the whole
    // class, not just the id
    @MetatypeID({message: 'Metatype must have valid ID'})
    @Expose({name: 'metatype_id', toClassOnly: true})
    @Transform(
        ({value}) => {
            const metatype = plainToClass(Metatype, {});
            metatype.id = value;
            return metatype;
        },
        {toClassOnly: true},
    )
    metatype: Metatype | undefined;

    // these two getters are to maintain the original api response for nodes
    @Expose({toPlainOnly: true})
    get metatype_id(): string {
        return this.metatype ? this.metatype.id! : '';
    }

    @IsOptional()
    metatype_name?: string;

    @IsObject()
    properties: object = {};

    @IsString()
    @IsOptional()
    original_data_id?: string;

    @IsString()
    @IsOptional()
    import_data_id?: string;

    @IsString()
    @IsOptional()
    data_staging_id?: string;

    @ValidateIf((o) => typeof o.composite_original_id !== 'undefined' && o.composite_original_id !== null)
    @IsString()
    data_source_id?: string;

    @IsString()
    @IsOptional()
    type_mapping_transformation_id?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => NodeMetadata)
    metadata?: NodeMetadata;

    constructor(input: {
        container_id: Container | string;
        metatype: Metatype | string;
        metatype_name?: string;
        properties: object;
        original_data_id?: string;
        import_data_id?: string;
        data_staging_id?: string;
        data_source_id?: string;
        type_mapping_transformation_id?: string;
        metadata?: NodeMetadata;
        created_at?: Date;
    }) {
        super();

        if (input) {
            input.container_id instanceof Container ? (this.container_id = input.container_id.id) : (this.container_id = input.container_id);
            input.metatype instanceof Metatype
                ? (this.metatype = input.metatype)
                : (this.metatype = plainToClass(Metatype, {
                      id: input.metatype,
                  }));
            if (input.metatype_name) this.metatype_name = input.metatype_name;
            this.properties = input.properties;
            if (input.original_data_id) this.original_data_id = input.original_data_id;
            if (input.import_data_id) this.import_data_id = input.import_data_id;
            if (input.data_staging_id) this.data_staging_id = input.data_staging_id;
            if (input.data_source_id) this.data_source_id = input.data_source_id;
            if (input.type_mapping_transformation_id) this.type_mapping_transformation_id = input.type_mapping_transformation_id;
            if (input.metadata) this.metadata = input.metadata;
            if (input.created_at) this.created_at = input.created_at;
        }
    }
}

// type guard for differentiating an array of nodes from either array of nodes or edges
export function IsNodes(set: Node[] | Edge[]): set is Node[] {
    // technically an empty array could be a set of NodeT
    if (Array.isArray(set) && set.length === 0) return true;

    return set[0] instanceof Node;
}
