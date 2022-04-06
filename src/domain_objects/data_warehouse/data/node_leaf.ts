import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {IsArray, IsObject, IsOptional, isString, IsString, ValidateIf, ValidateNested} from 'class-validator';
import {Expose, plainToClass, Transform, Type} from 'class-transformer';
import Metatype, {MetatypeID} from '../ontology/metatype';
import Container from '../ontology/container';
import MetatypeRelationshipPair, {MetatypeRelationshipPairID} from '../ontology/metatype_relationship_pair';
import {EdgeMetadata} from './edge';
import {NodeMetadata} from './node';

/*
    The NodeLeaf object represents a tree-like record object which consists of
    information on a node, one connected nodes, and the edge that connect them.
    Contains validations required for said object to be considered valid.
*/
export default class NodeLeaf extends BaseDomainClass {
    // container in which node-edge pairs reside
    container_id?: string;

    // origin (root node) properties
    origin_id?: string;

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

    edge_relationship_name?: string;

    // destination (outer node) properties
    destination_id?: string;

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
        container_id: Container | string;
        origin_metatype: Metatype | string;
        destination_metatype: Metatype | string;
        origin_metatype_name?: string;
        destination_metatype_name?: string;
        metatype_relationship_pair: MetatypeRelationshipPair | string;
        edge_relationship_name?: string;
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
            input.container_id instanceof Container? (this.container_id = input.container_id.id) : (this.container_id = input.container_id);
            input.origin_metatype instanceof Metatype
                ? (this.origin_metatype = input.origin_metatype)
                : (this.origin_metatype = plainToClass(Metatype, {id: input.origin_metatype_name}));
            input.destination_metatype instanceof Metatype
                ? (this.destination_metatype = input.destination_metatype)
                : (this.destination_metatype = plainToClass(Metatype, {id: input.destination_metatype_name}));
            if (input.origin_metatype_name) {this.origin_metatype_name = input.origin_metatype_name};
            if (input.destination_metatype_name) {this.destination_metatype_name = input.destination_metatype_name};
            if (input.edge_relationship_name) this.edge_relationship_name = input.edge_relationship_name;
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
            if (input.destination_type_mapping_transformation_id)
                this.destination_type_mapping_transformation_id = input.destination_type_mapping_transformation_id;
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
