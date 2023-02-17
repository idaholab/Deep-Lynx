import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {Type} from 'class-transformer';
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

    // while other domain objects perform transformation here,
    // we only need to return the id
    origin_metatype_id?: string;

    origin_metatype_uuid?: string;

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

    // while other domain objects perform transformation here,
    // we only need to return the id
    relationship_pair_id?: string;

    relationship_pair_uuid?: string;

    relationship_id?: string;

    relationship_uuid?: string;

    @Type(() => EdgeMetadata)
    edge_metadata?: EdgeMetadata;

    edge_created_at?: Date;

    edge_modified_at?: Date;

    // destination (root node) properties
    destination_id?: string;

    // while other domain objects perform transformation here,
    // we only need to return the id
    destination_metatype_id?: string;

    destination_metatype_uuid?: string;

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
        origin_metatype_id: string;
        origin_metatype_name?: string;
        origin_properties: object;
        origin_data_source?: string;
        origin_metadata?: NodeMetadata;
        edge_id: string;
        relationship_name?: string
        edge_properties: object;
        relationship_pair_id: string;
        relationship_id?: string;
        edge_metadata?: EdgeMetadata;
        destination_id?: string;
        destination_metatype_id: string;
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
            this.origin_metatype_id = input.origin_metatype_id;
            if (input.origin_metatype_name) {this.origin_metatype_name = input.origin_metatype_name};
            this.origin_properties = input.origin_properties;
            if (input.origin_data_source) {this.origin_data_source = input.origin_data_source};
            if (input.origin_metadata) {this.origin_metadata = input.origin_metadata};
            this.edge_id = input.edge_id;
            if (input.relationship_name) {this.relationship_name = input.relationship_name};
            this.edge_properties = input.edge_properties;
            this.relationship_pair_id = input.relationship_pair_id;
            if (input.relationship_id) {this.relationship_id = input.relationship_id};
            if (input.edge_metadata) {this.edge_metadata = input.edge_metadata};
            this.destination_id = input.destination_id;
            this.destination_metatype_id = input.destination_metatype_id;
            if (input.destination_metatype_name) {this.destination_metatype_name = input.destination_metatype_name};
            this.destination_properties = input.destination_properties;
            if (input.destination_data_source) {this.destination_data_source = input.destination_data_source};
            if (input.destination_metadata) {this.destination_metadata = input.destination_metadata};
            if (input.depth) {this.depth = input.depth};
            if (input.path) {this.path = input.path};
        }
    }
}

export const nodeLeafQuery = [`SELECT nodeleafs.* FROM
(WITH RECURSIVE search_graph(
    origin_id, origin_metatype_id, origin_metatype_name, origin_properties, origin_data_source,
    origin_metadata, origin_created_by, origin_created_at, origin_modified_by, origin_modified_at,
    origin_metatype_uuid, edge_id, relationship_name, edge_properties, relationship_pair_id, 
	relationship_pair_uuid, relationship_id, relationship_uuid, edge_data_source, edge_metadata, 
	edge_created_by, edge_created_at, edge_modified_by, edge_modified_at, destination_id, 
	destination_metatype_id, destination_metatype_name, destination_properties, destination_data_source, 
	destination_metadata, destination_created_by, destination_created_at, destination_modified_by, 
	destination_modified_at, destination_metatype_uuid, depth, path
) AS (
    SELECT n1.id, n1.metatype_id, n1.metatype_name, n1.properties, n1.data_source_id,
        n1.metadata, n1.created_by, n1.created_at, n1.modified_by, n1.modified_at, n1.metatype_uuid,
        g.id, g.metatype_relationship_name, g.properties, g.relationship_pair_id, 
        g.metatype_relationship_pair_uuid, g.relationship_id, g.metatype_relationship_uuid, 
        g.data_source_id, g.metadata, g.created_by, g.created_at, g.modified_at, g.modified_by, n2.id, 
        n2.metatype_id, n2.metatype_name, n2.properties, n2.data_source_id, n2.metadata, n2.created_by, 
        n2.created_at, n2.modified_by, n2.modified_at, n2.metatype_uuid, 1 as depth, 
        ARRAY[g.origin_id] AS path
    FROM current_edges g
     LEFT JOIN current_nodes n1 ON n1.id IN (g.origin_id, g.destination_id)
     LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id) AND n2.id != n1.id
    WHERE n1.id = $1 AND g.container_id = $2
UNION
    SELECT sg.destination_id, sg.destination_metatype_id, sg.destination_metatype_name,
        sg.destination_properties, sg.destination_data_source, sg.destination_metadata,
        sg.destination_created_by, sg.destination_created_at, sg.destination_modified_by,
        sg.destination_created_at, sg.destination_metatype_uuid, g.id, g.metatype_relationship_name, 
        g.properties, g.relationship_pair_id, g.metatype_relationship_pair_uuid, g.relationship_id, 
        g.metatype_relationship_uuid, g.data_source_id, g.metadata, g.created_by, g.created_at, 
        g.modified_at, g.modified_by, n2.id, n2.metatype_id, n2.metatype_name, n2.properties, 
        n2.data_source_id, n2.metadata, n2.created_by, n2.created_at, n2.modified_by, n2.modified_at, 
        n2.metatype_uuid, sg.depth + 1, path || sg.destination_id
    FROM current_edges g INNER JOIN search_graph sg
    ON sg.destination_id IN (g.origin_id, g.destination_id) AND (sg.destination_id <> ALL(sg.path))
     LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id)
        AND n2.id NOT IN (sg.origin_id, sg.destination_id)
     WHERE g.container_id = $2 AND sg.depth < $3
) SELECT * FROM search_graph
WHERE (origin_id = ANY(path)) AND destination_id IS NOT NULL AND origin_id IS NOT NULL
UNION
(WITH RECURSIVE search_graph(
    origin_id, origin_metatype_id, origin_metatype_name, origin_properties, origin_data_source,
    origin_metadata, origin_created_by, origin_created_at, origin_modified_by, origin_modified_at,
    origin_metatype_uuid, edge_id, relationship_name, edge_properties, relationship_pair_id, 
	relationship_pair_uuid, relationship_id, relationship_uuid, edge_data_source, edge_metadata, 
	edge_created_by, edge_created_at, edge_modified_by, edge_modified_at, destination_id, 
	destination_metatype_id, destination_metatype_name, destination_properties, destination_data_source, 
	destination_metadata, destination_created_by, destination_created_at, destination_modified_by, 
	destination_modified_at, destination_metatype_uuid, depth, path
) AS (
    SELECT n2.id, n2.metatype_id, n2.metatype_name, n2.properties, n2.data_source_id,
        n2.metadata, n2.created_by, n2.created_at, n2.modified_by, n2.modified_at, n2.metatype_uuid,
        g.id, g.metatype_relationship_name, g.properties, g.relationship_pair_id, 
        g.metatype_relationship_pair_uuid, g.relationship_id, g.metatype_relationship_uuid,
        g.data_source_id, g.metadata, g.created_by, g.created_at, g.modified_at, g.modified_by, n1.id, 
        n1.metatype_id, n1.metatype_name, n1.properties, n1.data_source_id, n1.metadata, n1.created_by,
        n1.created_at, n1.modified_by, n1.modified_at, n1.metatype_uuid, 1 as depth,
        ARRAY[g.destination_id] AS path
    FROM current_edges g
     LEFT JOIN current_nodes n1 ON n1.id IN (g.origin_id, g.destination_id)
     LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id) AND n2.id != n1.id
    WHERE n2.id = $1 AND g.container_id = $2
UNION
    SELECT sg.destination_id, sg.destination_metatype_id, sg.destination_metatype_name,
        sg.destination_properties, sg.destination_data_source, sg.destination_metadata,
        sg.destination_created_by, sg.destination_created_at, sg.destination_modified_by,
        sg.destination_modified_at, sg.destination_metatype_uuid, g.id, g.metatype_relationship_name, 
        g.properties, g.relationship_pair_id, g.metatype_relationship_pair_uuid, g.relationship_id,
        g.metatype_relationship_uuid, g.data_source_id, g.metadata, g.created_by, g.created_at,
        g.modified_at, g.modified_by, n2.id, n2.metatype_id, n2.metatype_name, n2.properties,
        n2.data_source_id, n2.metadata, n2.created_by, n2.created_at, n2.modified_by, n2.modified_at,
        n2.metatype_uuid, sg.depth + 1, path || sg.destination_id
    FROM current_edges g INNER JOIN search_graph sg
    ON sg.destination_id IN (g.origin_id, g.destination_id) AND (sg.destination_id <> ALL(sg.path))
     LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id)
        AND n2.id NOT IN (sg.origin_id, sg.destination_id)
     WHERE g.container_id = $2 AND sg.depth < $3
) SELECT * FROM search_graph
WHERE (origin_id = ANY(path)) AND destination_id IS NOT NULL AND origin_id IS NOT NULL)) nodeleafs
WHERE depth <= $3`];