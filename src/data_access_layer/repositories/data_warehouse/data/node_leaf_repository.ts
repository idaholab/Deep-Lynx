import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import NodeLeaf from '../../../../domain_objects/data_warehouse/data/node_leaf';
import Result from '../../../../common_classes/result';
import NodeLeafMapper from '../../../mappers/data_warehouse/data/node_leaf_mapper';
import {PoolClient} from 'pg';
/*
    NodeLeafRepository contains methods for retrieving NodeLeaf objects from
    storage. Users should interact with this repository. Users should
    interact with repositories when possible and not the mappers as the
    repositories contain additional logic such as validation or
    transformation prior to returning.
*/

export default class NodeLeafRepository extends Repository {
    #mapper: NodeLeafMapper = NodeLeafMapper.Instance;

    constructor(id: string, container_id: string, depth: string){
        super('');
        // in order to add filters to the base node leaf query we must set it
        // as the raw query here
        this._rawQuery = [
        `SELECT * FROM
            (WITH RECURSIVE search_graph(
                origin_id, origin_metatype_id, origin_metatype_name, origin_properties, origin_data_source,
                origin_metadata, origin_created_by, origin_created_at, origin_modified_by, origin_modified_at,
                edge_id, relationship_name, edge_properties, relationship_pair_id, relationship_id,
                edge_data_source, edge_metadata, edge_created_by, edge_created_at, edge_modified_by,
                edge_modified_at, destination_id, destination_metatype_id, destination_metatype_name,
                destination_properties, destination_data_source, destination_metadata, destination_created_by,
                destination_created_at, destination_modified_by, destination_modified_at, depth, path
            ) AS (
                SELECT n1.id, n1.metatype_id, n1.metatype_name, n1.properties, n1.data_source_id,
                    n1.metadata, n1.created_by, n1.created_at, n1.modified_by, n1.modified_at,
                    g.id, g.metatype_relationship_name, g.properties, g.relationship_pair_id, g.relationship_id,
                    g.data_source_id, g.metadata, g.created_by, g.created_at, g.modified_at, g.modified_by,
                    n2.id, n2.metatype_id, n2.metatype_name, n2.properties, n2.data_source_id,
                    n2.metadata, n2.created_by, n2.created_at, n2.modified_by, n2.modified_at,
                    1 as depth, ARRAY[g.origin_id] AS path
                FROM current_edges g
                 LEFT JOIN current_nodes n1 ON n1.id IN (g.origin_id, g.destination_id)
                 LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id) AND n2.id != n1.id
                WHERE n1.id = $1 AND g.container_id = $2
            UNION
                SELECT sg.destination_id, sg.destination_metatype_id, sg.destination_metatype_name,
                    sg.destination_properties, sg.destination_data_source, sg.destination_metadata,
                    sg.destination_created_by, sg.destination_created_at, sg.destination_modified_by,
                    sg.destination_created_at, g.id, g.metatype_relationship_name, g.properties,
                    g.relationship_pair_id, g.relationship_id, g.data_source_id, g.metadata, g.created_by,
                    g.created_at, g.modified_at, g.modified_by, n2.id, n2.metatype_id, n2.metatype_name,
                    n2.properties, n2.data_source_id, n2.metadata, n2.created_by, n2.created_at, n2.modified_by,
                    n2.modified_at, sg.depth + 1, path || sg.destination_id
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
                edge_id, relationship_name, edge_properties, relationship_pair_id, relationship_id,
                edge_data_source, edge_metadata, edge_created_by, edge_created_at, edge_modified_by,
                edge_modified_at, destination_id, destination_metatype_id, destination_metatype_name,
                destination_properties, destination_data_source, destination_metadata, destination_created_by,
                destination_created_at, destination_modified_by, destination_modified_at, depth, path
            ) AS (
                SELECT n2.id, n2.metatype_id, n2.metatype_name, n2.properties, n2.data_source_id,
                    n2.metadata, n2.created_by, n2.created_at, n2.modified_by, n2.modified_at,
                    g.id, g.metatype_relationship_name, g.properties, g.relationship_pair_id, g.relationship_id,
                    g.data_source_id, g.metadata, g.created_by, g.created_at, g.modified_at, g.modified_by,
                    n1.id, n1.metatype_id, n1.metatype_name, n1.properties, n1.data_source_id,
                    n1.metadata, n1.created_by, n1.created_at, n1.modified_by, n1.modified_at,
                    1 as depth, ARRAY[g.destination_id] AS path
                FROM current_edges g
                 LEFT JOIN current_nodes n1 ON n1.id IN (g.origin_id, g.destination_id)
                 LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id) AND n2.id != n1.id
                WHERE n2.id = $1 AND g.container_id = $2
            UNION
                SELECT sg.destination_id, sg.destination_metatype_id, sg.destination_metatype_name,
                    sg.destination_properties, sg.destination_data_source, sg.destination_metadata,
                    sg.destination_created_by, sg.destination_created_at, sg.destination_modified_by,
                    sg.destination_created_at, g.id, g.metatype_relationship_name, g.properties,
                    g.relationship_pair_id, g.relationship_id, g.data_source_id, g.metadata, g.created_by,
                    g.created_at, g.modified_at, g.modified_by, n2.id, n2.metatype_id, n2.metatype_name,
                    n2.properties, n2.data_source_id, n2.metadata, n2.created_by, n2.created_at, n2.modified_by,
                    n2.modified_at, sg.depth + 1, path || sg.destination_id
                FROM current_edges g INNER JOIN search_graph sg
                ON sg.destination_id IN (g.origin_id, g.destination_id) AND (sg.destination_id <> ALL(sg.path))
                 LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id)
                    AND n2.id NOT IN (sg.origin_id, sg.destination_id)
                 WHERE g.container_id = $2 AND sg.depth < $3
            ) SELECT * FROM search_graph
            WHERE (origin_id = ANY(path)) AND destination_id IS NOT NULL AND origin_id IS NOT NULL)) nodeleafs`,
        ];

        this._values = [id, container_id, depth];
    }

    // properties for nth layer node query:
    metatypeName(operator: string, value: any) {
        // checks for metatype name as origin or destination (anywhere in nodeLeaf object).
        // Parentheses needed, otherwise the second part of the OR statement will override
        // any previous filter logic.
        this._rawQuery.push('(');
        super.query('origin_metatype_name', operator, value);
        this._rawQuery.push('OR');
        super.query('destination_metatype_name', operator, value);
        this._rawQuery.push(')');
        return this;
    }

    originMetatypeName(operator: string, value: any) {
        super.query('origin_metatype_name', operator, value);
        return this;
    }

    destinationMetatypeName(operator: string, value: any) {
        super.query('destination_metatype_name', operator, value);
        return this;
    }

    metatypeId(operator: string, value: any) {
        // checks for metatype id as origin or destination (anywhere in nodeLeaf object).
        // Parentheses needed, otherwise the second part of the OR statement will override
        // any previous filter logic.
        this._rawQuery.push('(');
        super.query('origin_metatype_id', operator, value);
        this._rawQuery.push('OR');
        super.query('destination_metatype_id', operator, value);
        this._rawQuery.push(')');
        return this;
    }

    originMetatypeId(operator: string, value: any) {
        super.query('origin_metatype_id', operator, value);
        return this;
    }

    destinationMetatypeId(operator: string, value: any) {
        super.query('destination_metatype_id', operator, value);
        return this;
    }

    relationshipName(operator: string, value: any) {
        super.query('relationship_name', operator, value);
        return this;
    }

    relationshipId(operator: string, value: any) {
        super.query('relationship_id', operator, value);
        return this;
    }

    async list(queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<NodeLeaf[]>> {

        // store the first three values for re-initialization after list function is complete
        const resetValues = this._values.slice(0,3)

        const results = await super.findAll<NodeLeaf>(queryOptions, {
            transaction,
            resultClass: NodeLeaf
        });
        // reset the query
        this._rawQuery = [
        `SELECT * FROM
            (WITH RECURSIVE search_graph(
                origin_id, origin_metatype_id, origin_metatype_name, origin_properties, origin_data_source,
                origin_metadata, origin_created_by, origin_created_at, origin_modified_by, origin_modified_at,
                edge_id, relationship_name, edge_properties, relationship_pair_id, relationship_id,
                edge_data_source, edge_metadata, edge_created_by, edge_created_at, edge_modified_by,
                edge_modified_at, destination_id, destination_metatype_id, destination_metatype_name,
                destination_properties, destination_data_source, destination_metadata, destination_created_by,
                destination_created_at, destination_modified_by, destination_modified_at, depth, path
            ) AS (
                SELECT n1.id, n1.metatype_id, n1.metatype_name, n1.properties, n1.data_source_id,
                    n1.metadata, n1.created_by, n1.created_at, n1.modified_by, n1.modified_at,
                    g.id, g.metatype_relationship_name, g.properties, g.relationship_pair_id, g.relationship_id,
                    g.data_source_id, g.metadata, g.created_by, g.created_at, g.modified_at, g.modified_by,
                    n2.id, n2.metatype_id, n2.metatype_name, n2.properties, n2.data_source_id,
                    n2.metadata, n2.created_by, n2.created_at, n2.modified_by, n2.modified_at,
                    1 as depth, ARRAY[g.origin_id] AS path
                FROM current_edges g
                 LEFT JOIN current_nodes n1 ON n1.id IN (g.origin_id, g.destination_id)
                 LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id) AND n2.id != n1.id
                WHERE n1.id = $1 AND g.container_id = $2
            UNION
                SELECT sg.destination_id, sg.destination_metatype_id, sg.destination_metatype_name,
                    sg.destination_properties, sg.destination_data_source, sg.destination_metadata,
                    sg.destination_created_by, sg.destination_created_at, sg.destination_modified_by,
                    sg.destination_created_at, g.id, g.metatype_relationship_name, g.properties,
                    g.relationship_pair_id, g.relationship_id, g.data_source_id, g.metadata, g.created_by,
                    g.created_at, g.modified_at, g.modified_by, n2.id, n2.metatype_id, n2.metatype_name,
                    n2.properties, n2.data_source_id, n2.metadata, n2.created_by, n2.created_at, n2.modified_by,
                    n2.modified_at, sg.depth + 1, path || sg.destination_id
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
                edge_id, relationship_name, edge_properties, relationship_pair_id, relationship_id,
                edge_data_source, edge_metadata, edge_created_by, edge_created_at, edge_modified_by,
                edge_modified_at, destination_id, destination_metatype_id, destination_metatype_name,
                destination_properties, destination_data_source, destination_metadata, destination_created_by,
                destination_created_at, destination_modified_by, destination_modified_at, depth, path
            ) AS (
                SELECT n2.id, n2.metatype_id, n2.metatype_name, n2.properties, n2.data_source_id,
                    n2.metadata, n2.created_by, n2.created_at, n2.modified_by, n2.modified_at,
                    g.id, g.metatype_relationship_name, g.properties, g.relationship_pair_id, g.relationship_id,
                    g.data_source_id, g.metadata, g.created_by, g.created_at, g.modified_at, g.modified_by,
                    n1.id, n1.metatype_id, n1.metatype_name, n1.properties, n1.data_source_id,
                    n1.metadata, n1.created_by, n1.created_at, n1.modified_by, n1.modified_at,
                    1 as depth, ARRAY[g.destination_id] AS path
                FROM current_edges g
                 LEFT JOIN current_nodes n1 ON n1.id IN (g.origin_id, g.destination_id)
                 LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id) AND n2.id != n1.id
                WHERE n2.id = $1 AND g.container_id = $2
            UNION
                SELECT sg.destination_id, sg.destination_metatype_id, sg.destination_metatype_name,
                    sg.destination_properties, sg.destination_data_source, sg.destination_metadata,
                    sg.destination_created_by, sg.destination_created_at, sg.destination_modified_by,
                    sg.destination_created_at, g.id, g.metatype_relationship_name, g.properties,
                    g.relationship_pair_id, g.relationship_id, g.data_source_id, g.metadata, g.created_by,
                    g.created_at, g.modified_at, g.modified_by, n2.id, n2.metatype_id, n2.metatype_name,
                    n2.properties, n2.data_source_id, n2.metadata, n2.created_by, n2.created_at, n2.modified_by,
                    n2.modified_at, sg.depth + 1, path || sg.destination_id
                FROM current_edges g INNER JOIN search_graph sg
                ON sg.destination_id IN (g.origin_id, g.destination_id) AND (sg.destination_id <> ALL(sg.path))
                 LEFT JOIN current_nodes n2 ON n2.id IN (g.origin_id, g.destination_id)
                    AND n2.id NOT IN (sg.origin_id, sg.destination_id)
                 WHERE g.container_id = $2 AND sg.depth < $3
            ) SELECT * FROM search_graph
            WHERE (origin_id = ANY(path)) AND destination_id IS NOT NULL AND origin_id IS NOT NULL)) nodeleafs`,
        ];
        // reset the values to correspond with reset query
        this._values = resetValues

        if (results.isError) {return Promise.resolve(Result.Pass(results))};

        return Promise.resolve(results);
    }
}