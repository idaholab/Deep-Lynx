import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {Type} from 'class-transformer';
import {EdgeMetadata} from './edge';
import {NodeMetadata} from './node';
import { QueryConfig } from 'pg';

const format = require('pg-format');

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

    origin_data_source?: string;

    @Type(() => NodeMetadata)
    origin_metadata?: NodeMetadata;

    origin_metadata_properties: object = {};

    origin_properties: object = {};

    origin_created_at?: Date;

    origin_modified_at?: Date;

    // while other domain objects perform transformation here,
    // we only need to return the id
    origin_metatype_id?: string;

    origin_metatype_name?: string;

    origin_metatype_uuid?: string;

    // edge properties
    edge_id?: string;

    edge_data_source?: string;

    @Type(() => EdgeMetadata)
    edge_metadata?: EdgeMetadata;

    edge_properties: object = {};

    edge_metadata_properties: object = {};

    edge_created_at?: Date;

    edge_modified_at?: Date;

    // while other domain objects perform transformation here,
    // we only need to return the id
    relationship_pair_id?: string;

    relationship_pair_uuid?: string;

    relationship_id?: string;

    relationship_uuid?: string;

    relationship_name?: string;

    // origin (root node) properties
    destination_id?: string;

    destination_data_source?: string;

    @Type(() => NodeMetadata)
    destination_metadata?: NodeMetadata;

    destination_metadata_properties: object = {};

    destination_properties: object = {};

    destination_created_at?: Date;

    destination_modified_at?: Date;

    // while other domain objects perform transformation here,
    // we only need to return the id
    destination_metatype_id?: string;

    destination_metatype_name?: string;

    destination_metatype_uuid?: string;

	// cardinality of edge. if 'outgoing', origin_id is true origin.
	// if 'incoming', destination_id is true origin in edge.
	edge_direction?: string;

    // level of depth
    depth?: string;

    path?: string[];

    // no need to include input as we will never be inserting node leafs,
    // only retrieving
    constructor() {
        super();
    }
}

export function getNodeLeafQuery(nodeID: string, containerID: string, depth: string, use_original_id?: boolean) {
	// if use original id is specified, center the graph based on 
	// original data id instead of auto-assigned DeepLynx id
	const root_node = (use_original_id && use_original_id === true)
		? format(`o.original_data_id = ('%s')::text`, nodeID)
		: format(`o.id = %s`, nodeID);

	// container ID is used twice in the query, so it's mentioned twice in the params list
	return format(nodeLeafQuery, root_node, containerID, containerID, depth);
}

const nodeLeafQuery = `SELECT nodeleafs.* FROM
(WITH RECURSIVE search_graph(
	origin_id, origin_data_source, origin_metadata, origin_metadata_properties, origin_properties,
	origin_created_by, origin_created_at, origin_modified_by, origin_modified_at, origin_metatype_id, 
	edge_id, edge_data_source, edge_metadata, edge_metadata_properties, edge_properties,
	edge_created_by, edge_created_at, edge_modified_by, edge_modified_at, relationship_pair_id, 
	destination_id, destination_data_source, destination_metadata, destination_metadata_properties, 
	destination_properties, destination_created_by, destination_created_at, destination_modified_by,
	destination_modified_at, destination_metatype_id, edge_direction, depth, path
) AS (
	(SELECT DISTINCT ON (e.origin_id, e.destination_id, e.relationship_pair_id, e.data_source_id)
	 	o.id AS origin_id, o.data_source_id AS origin_data_source, o.metadata AS origin_metadata, 
		o.metadata_properties AS origin_metadata_properties, o.properties AS origin_properties, 
		o.created_by AS origin_created_by, o.created_at AS origin_created_at, 
		o.modified_by AS origin_modified_by, o.modified_at AS origin_modified_at, 
		o.metatype_id AS origin_metatype_id, e.id AS edge_id, e.data_source_id AS edge_data_source, 
		e.metadata AS edge_metadata, e.metadata_properties AS edge_metadata_properties, 
		e.properties AS edge_properties, e.created_by AS edge_created_by, e.created_at AS edge_created_at, 
		e.modified_by AS edge_modified_by, e.modified_at AS edge_modified_at, e.relationship_pair_id, 
		d.id AS destination_id, d.data_source_id AS destination_data_source, 
		d.metadata AS destination_metadata, d.metadata_properties AS destination_metadata_properties, 
		d.properties AS destination_properties, d.created_by AS destination_created_by, 
		d.created_at AS destination_created_at, d.modified_by AS destination_modified_by, 
		d.modified_at AS destination_modified_at, d.metatype_id AS destination_metatype_id, 
		CASE WHEN o.id = e.origin_id THEN 'outgoing' ELSE 'incoming' END AS edge_direction,
		1 AS depth, ARRAY[o.id] AS path
	FROM edges e
		LEFT JOIN nodes o ON o.id IN (e.origin_id, e.destination_id)
		LEFT JOIN nodes d ON d.id IN (e.origin_id, e.destination_id) AND o.id != d.id
	WHERE e.deleted_at IS NULL AND %s AND e.container_id = %s
	ORDER BY e.origin_id, e.destination_id, e.relationship_pair_id, 
	 	e.data_source_id, e.created_at DESC, o.created_at DESC, d.created_at DESC)
UNION
	(SELECT DISTINCT ON (e.origin_id, e.destination_id, e.relationship_pair_id, e.data_source_id)
		g.destination_id AS origin_id, g.destination_data_source AS origin_data_source, 
		g.destination_metadata AS origin_metadata, g.destination_metadata_properties AS origin_metadata_properties, 
		g.destination_properties AS origin_properties, g.destination_created_by AS origin_created_by, 
		g.destination_created_at AS origin_created_at, g.destination_modified_by AS origin_modified_by, 
		g.destination_modified_at AS origin_modified_at, g.destination_metatype_id AS origin_metatype_id, 
		e.id AS edge_id, e.data_source_id AS edge_data_source, 
		e.metadata AS edge_metadata, e.metadata_properties AS edge_metadata_properties, 
		e.properties AS edge_properties, e.created_by AS edge_created_by, e.created_at AS edge_created_at, 
		e.modified_by AS edge_modified_by, e.modified_at AS edge_modified_at, e.relationship_pair_id, 
		d.id AS destination_id, d.data_source_id AS destination_data_source, 
		d.metadata AS destination_metadata, d.metadata_properties AS destination_metadata_properties, 
		d.properties AS destination_properties, d.created_by AS destination_created_by, 
		d.created_at AS destination_created_at, d.modified_by AS destination_modified_by, 
		d.modified_at AS destination_modified_at, d.metatype_id AS destination_metatype_id, 
		CASE WHEN g.destination_id = e.origin_id THEN 'outgoing' ELSE 'incoming' END AS edge_direction,
		depth + 1 AS depth, path || g.destination_id AS path
	FROM edges e
		INNER JOIN search_graph g ON g.destination_id 
			IN (e.origin_id, e.destination_id)
	 		AND g.destination_id <> ALL(g.path)
		LEFT JOIN nodes d ON d.id 
	 		IN (e.origin_id, e.destination_id)
			AND g.destination_id != d.id
	WHERE e.container_id = %s AND depth < %s AND d.id <> ALL(path)
	ORDER BY e.origin_id, e.destination_id, e.relationship_pair_id, 
	 	e.data_source_id, e.created_at DESC, g.destination_created_at DESC, d.created_at DESC)
) SELECT 
	g.origin_id, origin_data_source, origin_metadata, origin_metadata_properties, 
	origin_properties, origin_created_by, origin_created_at, origin_modified_by, 
	origin_modified_at, g.origin_metatype_id, ometa.name AS origin_metatype_name,
	ometa.uuid AS origin_metatype_uuid, edge_id, edge_data_source, edge_metadata, 
	edge_metadata_properties, edge_properties, edge_created_by, edge_created_at, 
	edge_modified_by, edge_modified_at, relationship_pair_id, 
	p.uuid AS relationship_pair_uuid, r.id AS relationship_id, 
	r.uuid AS relationship_uuid, r.name AS relationship_name,
	g.destination_id, destination_data_source, destination_metadata, 
	destination_metadata_properties, destination_properties, destination_created_by, 
	destination_created_at, destination_modified_by, destination_modified_at, 
	g.destination_metatype_id, dmeta.name AS destination_metatype_name,
	dmeta.uuid AS destination_metatype_uuid, depth, path, edge_direction
FROM search_graph g
	LEFT JOIN metatypes ometa ON ometa.id = g.origin_metatype_id
	LEFT JOIN metatypes dmeta ON dmeta.id = g.destination_metatype_id
	LEFT JOIN metatype_relationship_pairs p ON g.relationship_pair_id = p.id
	LEFT JOIN metatype_relationships r ON p.relationship_id = r.id
ORDER BY depth, path, g.destination_id) nodeleafs`;