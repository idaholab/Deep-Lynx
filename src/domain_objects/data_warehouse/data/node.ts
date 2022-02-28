import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {IsArray, IsObject, IsOptional, isString, IsString, ValidateIf, ValidateNested} from 'class-validator';
import {Expose, plainToClass, Transform, Type} from 'class-transformer';
import Metatype, {MetatypeID} from '../ontology/metatype';
import Container from '../ontology/container';
import Edge from './edge';
import {Conversion} from '../etl/type_transformation';
import MetatypeRelationshipPair, {MetatypeRelationshipPairID} from '../ontology/metatype_relationship_pair';
import { EdgeMetadata } from './edge';

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

/*
    The NodeLeaf object represents a tree-like record object which consists of
    information on a node, one connected nodes, and the edge that connect them.
    Contains validations required for said object to be considered valid.
*/
export class NodeLeaf extends BaseDomainClass {
    // origin (root node) properties
        origin_id?: string;

        origin_container_id?: string;

        // use metatype id to retrieve information on the origin node's metatype.
        // Retrieves the whole class, not just the id.
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
        origin_metatype: Metatype | undefined;

        // get orig metatype id from Metatype class
        @Expose({toPlainOnly: true})
        get origin_metatype_id(): string {
            return this.origin_metatype ? this.origin_metatype.id! : '';
        }

        origin_metatype_name?: string;

        origin_properties: object = {};

        origin_original_data_id?: string;

        origin_import_data_id?: string;

        origin_data_staging_id?: string;

        origin_data_source_id?: string;

        origin_type_mapping_transformation_id?: string;

        @Type(() => NodeMetadata)
        origin_metadata?: NodeMetadata;

        origin_created_at?: Date;

    // edge properties
        edge_id?: string;

        edge_container_id?: string;

        // use metatype relationship pair id to get info on the edge's
        // relationship type. Gets the whole class, not just the id.
        @MetatypeRelationshipPairID({
            message: 'Metatype relationship pair must have valid ID',
        })
        @Expose({name: 'relationship_pair_id', toClassOnly: true})
        @Transform(
            ({value}) => {
                const p = plainToClass(MetatypeRelationshipPair, {})
                p.id = value;
                return p;
            },
            {toClassOnly: true},
        )
        metatypeRelationshipPair: MetatypeRelationshipPair | undefined;

        // get relationship pair id from Metatype Relationship Pair class
        @Expose({toPlainOnly: true})
        get relationship_pair_id(): string {
            return this.metatypeRelationshipPair ? this.metatypeRelationshipPair.id! : '';
        }

        metatype_relationship_name?: string;

        edge_properties: object = {};

        edge_import_data_id?: string;

        edge_data_staging_id?: string;

        edge_data_source_id?: string;

        edge_type_mapping_transformation_id?: string;

        @Type(() => EdgeMetadata)
        edge_metadata?: EdgeMetadata;

        edge_created_at?: Date;

    // destination (outer node) properties
        destination_id?: string;

        destination_container_id?: string;

        // use metatype id to retrieve information on the origin node's metatype.
        // Retrieves the whole class, not just the id.
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
        destination_metatype: Metatype | undefined;

        // get orig metatype id from Metatype class
        @Expose({toPlainOnly: true})
        get destination_metatype_id(): string {
            return this.destination_metatype ? this.destination_metatype.id! : '';
        }

        destination_metatype_name?: string;

        destination_properties: object = {};

        destination_original_data_id?: string;

        destination_import_data_id?: string;

        destination_data_staging_id?: string;

        destination_data_source_id?: string;

        destination_type_mapping_transformation_id?: string;

        @Type(() => NodeMetadata)
        destination_metadata?: NodeMetadata;

        destination_created_at?: Date;

    // level of depth
    depth?: string;

    constructor(input: {
        origin_container_id: Container | string;
        edge_container_id: Container | string;
        destination_container_id: Container | string;
        origin_metatype: Metatype | string;
        destination_metatype: Metatype | string;
        origin_metatype_name?: string;
        destination_metatype_name?: string;
        metatype_relationship_pair: MetatypeRelationshipPair | string;
        metatype_name?: string;
        origin_properties: object;
        edge_properties: object;
        destination_properties: object;
        origin_original_data_id?: string;
        destination_original_data_id?: string;
        origin_import_data_id?: string;
        edge_import_data_id?: string;
        destination_import_data_id?: string;
        origin_data_staging_id?: string;
        edge_data_staging_id?: string;
        destination_data_staging_id?: string;
        origin_data_source_id?: string;
        edge_data_source_id?: string;
        destination_data_source_id?: string;
        origin_type_mapping_transformation_id?: string;
        edge_type_mapping_transformation_id?: string;
        destination_type_mapping_transformation_id?: string;
        origin_metadata?: NodeMetadata;
        edge_metadata?: EdgeMetadata;
        destination_metadata?: NodeMetadata;
        origin_created_at?: Date;
        edge_created_at?: Date;
        destination_created_at?: Date;
        depth?: string;
    }) {
        super();

        if (input) {
            input.origin_container_id instanceof Container? (this.origin_container_id = input.origin_container_id.id) : (this.origin_container_id = input.origin_container_id);
            input.destination_container_id instanceof Container? (this.destination_container_id = input.destination_container_id.id) : (this.destination_container_id = input.destination_container_id);
            input.edge_container_id instanceof Container? (this.edge_container_id = input.edge_container_id.id) : (this.edge_container_id = input.edge_container_id);
            input.origin_metatype instanceof Metatype
                ? (this.origin_metatype = input.origin_metatype)
                : (this.origin_metatype = plainToClass(Metatype, {
                    id: input.origin_metatype_name,
                }));
            input.destination_metatype instanceof Metatype
                ? (this.destination_metatype = input.destination_metatype)
                : (this.destination_metatype = plainToClass(Metatype, {
                    id: input.destination_metatype_name,
                }));
            if (input.origin_metatype_name) this.origin_metatype_name = input.metatype_name;
            if (input.destination_metatype_name) this.destination_metatype_name = input.metatype_name;
            this.origin_properties = input.origin_properties;
            this.edge_properties = input.edge_properties;
            this.destination_properties = input.destination_properties;
            if (input.origin_original_data_id) this.origin_original_data_id = input.origin_original_data_id;
            if (input.destination_original_data_id) this.destination_original_data_id = input.destination_original_data_id;
            if (input.origin_data_staging_id) this.origin_data_staging_id = input.origin_data_staging_id;
            if (input.edge_data_staging_id) this.edge_data_staging_id = input.edge_data_staging_id;
            if (input.destination_data_staging_id) this.destination_data_staging_id = input.destination_data_staging_id;
            if (input.origin_data_source_id) this.origin_data_source_id = input.origin_data_source_id;
            if (input.edge_data_source_id) this.edge_data_source_id = input.edge_data_source_id;
            if (input.destination_data_source_id) this.destination_data_source_id = input.destination_data_source_id;
            if (input.origin_type_mapping_transformation_id) this.origin_type_mapping_transformation_id = input.origin_type_mapping_transformation_id;
            if (input.edge_type_mapping_transformation_id) this.edge_type_mapping_transformation_id = input.edge_type_mapping_transformation_id;
            if (input.destination_type_mapping_transformation_id) this.destination_type_mapping_transformation_id = input.destination_type_mapping_transformation_id;
            if (input.origin_metadata) this.origin_metadata = input.origin_metadata;
            if (input.edge_metadata) this.edge_metadata = input.edge_metadata;
            if (input.destination_metadata) this.destination_metadata = input.destination_metadata;
            if (input.origin_created_at) this.origin_created_at = input.origin_created_at;
            if (input.edge_created_at) this.edge_created_at = input.edge_created_at;
            if (input.destination_created_at) this.destination_created_at = input.destination_created_at;
            if (input.depth) this.depth = input.depth;
        }
    }
}