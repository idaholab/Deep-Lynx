import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {Expose, plainToClass, Transform, Type} from 'class-transformer';
import Metatype, {MetatypeID} from '../ontology/metatype';
import MetatypeRelationshipPair, {MetatypeRelationshipPairID} from '../ontology/metatype_relationship_pair';
import {EdgeMetadata} from './edge';
import {NodeMetadata} from './node';

/*
    The NodeLeaf object represents a tree-like record object which consists of
    information on a node, one connected nodes, and the edge that connect them.
    Contains validations required for said object to be considered valid. This
    object is not like other objects, in the sense that it will likely never be
    initialized via user input. It does not represent any one table in the
    database but rather the fetched result of a combination of nodes and edges,
    along with a few other fields.
*/
export default class NodeLeaf extends BaseDomainClass {
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

    origin_data_source?: string;

    @Type(() => NodeMetadata)
    origin_metadata?: NodeMetadata;

    origin_created_at?: Date;

    origin_modified_at?: Date;

    // edge properties
    edge_id?: string;

    relationship_name?: string;

    edge_properties: object = {};

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
    relationship_pair: MetatypeRelationshipPair | undefined;

    // get relationship pair id from Metatype Relationship Pair class
    @Expose({toPlainOnly: true})
    get relationship_pair_id(): string {
        return this.relationship_pair ? this.relationship_pair.id! : '';
    }

    relationship_id?: string;

    @Type(() => EdgeMetadata)
    edge_metadata?: EdgeMetadata;

    edge_created_at?: Date;

    edge_modified_at?: Date;

    // destination (root node) properties
    destination_id?: string;

    // use metatype id to retrieve information on the destination node's metatype.
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

    destination_data_source?: string;

    @Type(() => NodeMetadata)
    destination_metadata?: NodeMetadata;

    destination_created_at?: Date;

    destination_modified_at?: Date;

    // level of depth
    depth?: string;

    path?: string[];

    constructor(input: {
        origin_id: string;
        origin_metatype: Metatype | string;
        origin_metatype_name?: string;
        origin_properties: object;
        origin_data_source?: string;
        origin_metadata?: NodeMetadata;
        edge_id: string;
        relationship_name?: string
        edge_properties: object;
        relationship_pair: MetatypeRelationshipPair | string;
        relationship_id?: string;
        edge_metadata?: EdgeMetadata;
        destination_id?: string;
        destination_metatype: Metatype | string;
        destination_metatype_name?: string;
        destination_properties: object;
        destination_data_source?: string;
        destination_metadata?: NodeMetadata;
        depth?: string;
        path?: string[];
    }) {
        super();

        if (input) {
            this.origin_id = input.origin_id;
            input.origin_metatype instanceof Metatype
                ? (this.origin_metatype = input.origin_metatype)
                : (this.origin_metatype = plainToClass(Metatype, {id: input.origin_metatype_name}));
            if (input.origin_metatype_name) {this.origin_metatype_name = input.origin_metatype_name};
            this.origin_properties = input.origin_properties;
            if (input.origin_data_source) {this.origin_data_source = input.origin_data_source};
            if (input.origin_metadata) {this.origin_metadata = input.origin_metadata};
            this.edge_id = input.edge_id;
            if (input.relationship_name) {this.relationship_name = input.relationship_name};
            this.edge_properties = input.edge_properties;
            input.relationship_pair instanceof MetatypeRelationshipPair
                ? (this.relationship_pair = input.relationship_pair)
                : (this.relationship_pair = plainToClass(MetatypeRelationshipPair, {id: input.relationship_pair}));
            if (input.relationship_id) {this.relationship_id = input.relationship_id};
            if (input.edge_metadata) {this.edge_metadata = input.edge_metadata};
            this.destination_id = input.destination_id;
            input.destination_metatype instanceof Metatype
                ? (this.destination_metatype = input.destination_metatype)
                : (this.destination_metatype = plainToClass(Metatype, {id: input.destination_metatype_name}));
            if (input.destination_metatype_name) {this.destination_metatype_name = input.destination_metatype_name};
            this.destination_properties = input.destination_properties;
            if (input.destination_data_source) {this.destination_data_source = input.destination_data_source};
            if (input.destination_metadata) {this.destination_metadata = input.destination_metadata};
            if (input.depth) {this.depth = input.depth};
            if (input.path) {this.path = input.path};
        }
    }
}
