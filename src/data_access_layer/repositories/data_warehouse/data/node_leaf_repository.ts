import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import {NodeLeaf} from '../../../../domain_objects/data_warehouse/data/node';
import Result from '../../../../common_classes/result';
import NodeLeafMapper from '../../../mappers/data_warehouse/data/node_leaf_mapper';
import {PoolClient} from 'pg';
/*
    NodeLeafRepository contains methods for persisting and retrieving nodes
    to storage as well as mapping things like validation. Users should
    interact with repositories when possible and not the mappers as the
    repositories contain additional logic such as validation or
    transformation prior to storage or returning.
*/

export default class NodeLeafRepository extends Repository {
    #mapper: NodeLeafMapper = NodeLeafMapper.Instance;

    constructor(id: string, container_id: string, depth: string){
        super('');
        // in order to add filters to the base node leaf query we must set it
        // as the raw query here
        this._rawQuery = [
            `WITH RECURSIVE related (container_id, origin_id, origin_metatype_id, origin_data_source_id, origin_import_data_id, origin_data_staging_id, 
                origin_type_mapping_transformation_id, origin_original_data_id, origin_properties, origin_metadata, origin_created_at, origin_modified_at, 
                origin_deleted_at, origin_created_by, origin_modified_by, origin_metatype_name, edge_id, edge_relationship_pair_id, edge_data_source_id, 
                edge_import_data_id, edge_data_staging_id, edge_type_mapping_transformation_id, edge_metadata, edge_created_at, edge_modified_at, 
                edge_deleted_at, edge_properties, edge_modified_by, edge_created_by, edge_relationship_name, edge_relationship_id, destination_id, 
                destination_metatype_id, destination_data_source_id, destination_import_data_id, destination_data_staging_id, 
                destination_type_mapping_transformation_id, destination_original_data_id, destination_properties, destination_metadata, 
                destination_created_at, destination_modified_at, destination_deleted_at, destination_created_by, destination_modified_by, 
                destination_metatype_name, depth) AS (
            SELECT o.container_id, o.id, o.metatype_id, o.data_source_id, o.import_data_id, o.data_staging_id, o.type_mapping_transformation_id, 
            o.original_data_id, o.properties, o.metadata, o.created_at, o.modified_at, o.deleted_at, o.created_by, o.modified_by, o.metatype_name, e.id, 
            e.relationship_pair_id, e.data_source_id, e.import_data_id, e.data_staging_id, e.type_mapping_transformation_id, e.metadata, e.created_at, 
            e.modified_at, e.deleted_at, e.properties, e.modified_by, e.created_by, e.metatype_relationship_name, e.relationship_id, d.id, d.metatype_id, 
            d.data_source_id, d.import_data_id, d.data_staging_id, d.type_mapping_transformation_id, d.original_data_id, d.properties, d.metadata, 
            d.created_at, d.modified_at, d.deleted_at, d.created_by, d.modified_by, d.metatype_name, 1
            FROM current_nodes o
                JOIN current_edges e
                    ON o.id IN (e.origin_id, e.destination_id)
                JOIN current_nodes d
                    ON d.id IN (e.origin_id, e.destination_id)
                    AND d.id != o.id
            WHERE o.id = $1
            UNION ALL
            SELECT r.container_id, r.destination_id, r.destination_metatype_id, r.destination_data_source_id, r.destination_import_data_id, 
            r.destination_data_staging_id, r.destination_type_mapping_transformation_id, r.destination_original_data_id, r.destination_properties, 
            r.destination_metadata, r.destination_created_at, r.destination_modified_at, r.destination_deleted_at, r.destination_created_by, 
            r.destination_modified_by, r.destination_metatype_name, e.id, e.relationship_pair_id, e.data_source_id, e.import_data_id, e.data_staging_id, 
            e.type_mapping_transformation_id, e.metadata, e.created_at, e.modified_at, e.deleted_at, e.properties, e.modified_by, e.created_by, 
            e.metatype_relationship_name, e.relationship_id, d.id, d.metatype_id, d.data_source_id, d.import_data_id, d.data_staging_id, 
            d.type_mapping_transformation_id, d.original_data_id, d.properties, d.metadata, d.created_at, d.modified_at, d.deleted_at, d.created_by, 
            d.modified_by, d.metatype_name, r.depth+1
            FROM related r
                JOIN current_edges e
                    ON r.destination_id IN (e.origin_id, e.destination_id)
                JOIN current_nodes d
                    ON d.id IN (e.origin_id, e.destination_id)
                    AND d.id != r.origin_id AND d.id != r.destination_id
        ) SELECT * FROM related WHERE container_id = $2 AND depth <= $3`,
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
        super.query('edge_relationship_name', operator, value);
        return this;
    }

    relationshipId(operator: string, value: any) {
        super.query('edge_relationship_id', operator, value);
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
            `WITH RECURSIVE related (container_id, origin_id, origin_metatype_id, origin_data_source_id, origin_import_data_id, origin_data_staging_id, 
                origin_type_mapping_transformation_id, origin_original_data_id, origin_properties, origin_metadata, origin_created_at, origin_modified_at, 
                origin_deleted_at, origin_created_by, origin_modified_by, origin_metatype_name, edge_id, edge_relationship_pair_id, edge_data_source_id, 
                edge_import_data_id, edge_data_staging_id, edge_type_mapping_transformation_id, edge_metadata, edge_created_at, edge_modified_at, 
                edge_deleted_at, edge_properties, edge_modified_by, edge_created_by, edge_relationship_name, edge_relationship_id, destination_id, 
                destination_metatype_id, destination_data_source_id, destination_import_data_id, destination_data_staging_id, 
                destination_type_mapping_transformation_id, destination_original_data_id, destination_properties, destination_metadata, 
                destination_created_at, destination_modified_at, destination_deleted_at, destination_created_by, destination_modified_by, 
                destination_metatype_name, depth) AS (
            SELECT o.container_id, o.id, o.metatype_id, o.data_source_id, o.import_data_id, o.data_staging_id, o.type_mapping_transformation_id, 
            o.original_data_id, o.properties, o.metadata, o.created_at, o.modified_at, o.deleted_at, o.created_by, o.modified_by, o.metatype_name, e.id, 
            e.relationship_pair_id, e.data_source_id, e.import_data_id, e.data_staging_id, e.type_mapping_transformation_id, e.metadata, e.created_at, 
            e.modified_at, e.deleted_at, e.properties, e.modified_by, e.created_by, e.metatype_relationship_name, e.relationship_id, d.id, d.metatype_id, 
            d.data_source_id, d.import_data_id, d.data_staging_id, d.type_mapping_transformation_id, d.original_data_id, d.properties, d.metadata, 
            d.created_at, d.modified_at, d.deleted_at, d.created_by, d.modified_by, d.metatype_name, 1
            FROM current_nodes o
                JOIN current_edges e
                    ON o.id IN (e.origin_id, e.destination_id)
                JOIN current_nodes d
                    ON d.id IN (e.origin_id, e.destination_id)
                    AND d.id != o.id
            WHERE o.id = $1
            UNION ALL
            SELECT r.container_id, r.destination_id, r.destination_metatype_id, r.destination_data_source_id, r.destination_import_data_id, 
            r.destination_data_staging_id, r.destination_type_mapping_transformation_id, r.destination_original_data_id, r.destination_properties, 
            r.destination_metadata, r.destination_created_at, r.destination_modified_at, r.destination_deleted_at, r.destination_created_by, 
            r.destination_modified_by, r.destination_metatype_name, e.id, e.relationship_pair_id, e.data_source_id, e.import_data_id, e.data_staging_id, 
            e.type_mapping_transformation_id, e.metadata, e.created_at, e.modified_at, e.deleted_at, e.properties, e.modified_by, e.created_by, 
            e.metatype_relationship_name, e.relationship_id, d.id, d.metatype_id, d.data_source_id, d.import_data_id, d.data_staging_id, 
            d.type_mapping_transformation_id, d.original_data_id, d.properties, d.metadata, d.created_at, d.modified_at, d.deleted_at, d.created_by, 
            d.modified_by, d.metatype_name, r.depth+1
            FROM related r
                JOIN current_edges e
                    ON r.destination_id IN (e.origin_id, e.destination_id)
                JOIN current_nodes d
                    ON d.id IN (e.origin_id, e.destination_id)
                    AND d.id != r.origin_id AND d.id != r.destination_id
        ) SELECT * FROM related WHERE container_id = $2 AND depth <= $3`,
        ];
        // reset the values to correspond with reset query
        this._values = resetValues

        if (results.isError) {return Promise.resolve(Result.Pass(results))};

        return Promise.resolve(results);
    }
}