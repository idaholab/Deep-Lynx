import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {IsArray, IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID, ValidateIf, ValidateNested} from 'class-validator';
import {Expose, plainToClass, Transform, Type} from 'class-transformer';
import Container from '../ontology/container';
import MetatypeRelationshipPair, {MetatypeRelationshipPairID} from '../ontology/metatype_relationship_pair';
import Node from './node';
import {Conversion} from '../etl/type_transformation';

export class EdgeMetadata {
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
    Edge represents an edge record in the Deep Lynx database and the various
    validations required for said record to be considered valid.
 */
export default class Edge extends BaseDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    container_id?: string;

    // we often need the metatype relationship's name, it's keys, or access to other properties
    // when we deal with nodes, so for ease of use we're going to use the whole
    // class, not just the id
    @MetatypeRelationshipPairID({
        message: 'Metatype relationship pair must have valid ID',
    })
    @Expose({name: 'relationship_pair_id', toClassOnly: true})
    @Transform(
        ({value}) => {
            const p = plainToClass(MetatypeRelationshipPair, {});
            p.id = value;
            return p;
        },
        {toClassOnly: true},
    )
    metatypeRelationshipPair: MetatypeRelationshipPair | undefined;

    // these two getters are to maintain the original api response for nodes
    @Expose({toPlainOnly: true})
    get relationship_pair_id(): string {
        return this.metatypeRelationshipPair ? this.metatypeRelationshipPair.id! : '';
    }

    @IsString()
    @IsOptional()
    metatype_relationship_name?: string;

    @IsObject()
    properties: object = {};

    @IsString()
    @IsOptional()
    import_data_id?: string;

    @IsString()
    @IsOptional()
    data_staging_id?: string;

    @IsString()
    @IsOptional()
    data_source_id?: string;

    @IsString()
    @IsOptional()
    type_mapping_transformation_id?: string;

    @ValidateIf((o) => o.origin_original_id === null && typeof o.origin_original_id === 'undefined')
    @IsString()
    origin_id?: string;

    @ValidateIf((o) => o.destination_original_id === null && typeof o.destination_original_id === 'undefined')
    @IsString()
    destination_id?: string;

    @IsString()
    @IsOptional()
    origin_original_id?: string;

    @ValidateIf((o) => o.origin_original_id !== null && typeof o.origin_original_id !== 'undefined')
    @IsString()
    origin_data_source_id?: string;

    @ValidateIf((o) => o.origin_original_id !== null && typeof o.origin_original_id !== 'undefined')
    @IsString()
    origin_metatype_id?: string;

    @IsString()
    @IsOptional()
    destination_original_id?: string;

    @ValidateIf((o) => o.destination_original_id !== null && typeof o.destination_original_id !== 'undefined')
    @IsString()
    destination_data_source_id?: string;

    @ValidateIf((o) => o.destination_original_id !== null && typeof o.destination_original_id !== 'undefined')
    @IsString()
    destination_metatype_id?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => EdgeMetadata)
    metadata?: EdgeMetadata;

    constructor(input: {
        container_id: Container | string;
        metatype_relationship_pair: MetatypeRelationshipPair | string;
        metatype_name?: string;
        properties: object;
        import_data_id?: string;
        data_staging_id?: string;
        data_source_id?: string;
        type_mapping_transformation_id?: string;
        origin_id?: string;
        origin_data_source_id?: string;
        origin_metatype_id?: string;
        destination_id?: string;
        destination_data_source_id?: string;
        destination_metatype_id?: string;
        origin_original_id?: string;
        destination_original_id?: string;
        metadata?: EdgeMetadata;
        created_at?: Date;
    }) {
        super();

        if (input) {
            input.container_id instanceof Container ? (this.container_id = input.container_id.id) : (this.container_id = input.container_id);
            if (input.metatype_relationship_pair instanceof MetatypeRelationshipPair) {
                this.metatypeRelationshipPair = input.metatype_relationship_pair;
            } else this.metatypeRelationshipPair = plainToClass(MetatypeRelationshipPair, {id: input.metatype_relationship_pair});
            this.properties = input.properties;
            if (input.import_data_id) this.import_data_id = input.import_data_id;
            if (input.data_staging_id) this.data_staging_id = input.data_staging_id;
            if (input.data_source_id) this.data_source_id = input.data_source_id;
            if (input.type_mapping_transformation_id) this.type_mapping_transformation_id = input.type_mapping_transformation_id;
            if (input.origin_id) this.origin_id = input.origin_id;
            if (input.origin_original_id) this.origin_original_id = input.origin_original_id;
            if (input.origin_data_source_id) this.origin_data_source_id = input.origin_data_source_id;
            if (input.origin_metatype_id) this.origin_metatype_id = input.origin_metatype_id;
            if (input.destination_id) this.destination_id = input.destination_id;
            if (input.destination_original_id) this.destination_original_id = input.destination_original_id;
            if (input.destination_data_source_id) this.destination_data_source_id = input.destination_data_source_id;
            if (input.destination_metatype_id) this.destination_metatype_id = input.destination_metatype_id;
            if (input.metadata) this.metadata = input.metadata;
            if (input.created_at) this.created_at = input.created_at;
        }
    }
}

// type guard for differentiating an array of edges from either array of nodes or edges
export function IsEdges(set: Node[] | Edge[]): set is Edge[] {
    // technically an empty array could be a set of EdgeT
    if (Array.isArray(set) && set.length === 0) return true;

    return set[0] instanceof Edge;
}
