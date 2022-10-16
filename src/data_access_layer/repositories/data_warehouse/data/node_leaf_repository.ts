import {FileOptions, QueryOptions, Repository} from '../../repository';
import NodeLeaf, {nodeLeafQuery} from '../../../../domain_objects/data_warehouse/data/node_leaf';
import Result from '../../../../common_classes/result';
import {PoolClient} from 'pg';
import File from '../../../../domain_objects/data_warehouse/data/file';

/*
    NodeLeafRepository contains methods for retrieving NodeLeaf objects from
    storage. Users should interact with this repository. Users should
    interact with repositories when possible and not the mappers as the
    repositories contain additional logic such as validation or
    transformation prior to returning.
*/

export default class NodeLeafRepository extends Repository {
    constructor(id: string, container_id: string, depth: string) {
        super('nodeleafs');
        // in order to add filters to the base node leaf query we must set it
        // as the raw query here
        this._query.SELECT = nodeLeafQuery;
        this._query.VALUES = [id, container_id, depth];
        this._query.WHERE = [];
    }

    // properties for nth layer node query:
    originMetatypeName(operator: string, value: any) {
        super.query('nodeleafs.origin_metatype_name', operator, value);
        return this;
    }

    destinationMetatypeName(operator: string, value: any) {
        super.query('nodeleafs.destination_metatype_name', operator, value);
        return this;
    }

    originMetatypeId(operator: string, value: any) {
        super.query('nodeleafs.origin_metatype_id', operator, value);
        return this;
    }

    originMetatypeUUID(operator: string, value: any) {
        super.query('nodeleafs.origin_metatype_uuid', operator, value);
        return this;
    }

    destinationMetatypeId(operator: string, value: any) {
        super.query('nodeleafs.destination_metatype_id', operator, value);
        return this;
    }

    destinationMetatypeUUID(operator: string, value: any) {
        super.query('nodeleafs.destination_metatype_uuid', operator, value);
        return this;
    }

    relationshipName(operator: string, value: any) {
        super.query('nodeleafs.relationship_name', operator, value);
        return this;
    }

    relationshipId(operator: string, value: any) {
        super.query('nodeleafs.relationship_id', operator, value);
        return this;
    }

    relationshipUUID(operator: string, value: any) {
        super.query('nodeleafs.relationship_uuid', operator, value);
        return this;
    }

    async list(queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<NodeLeaf[]>> {
        // store the first three values for re-initialization after list function is complete
        const resetValues = this._query.VALUES.slice(0, 3);

        const results = await super.findAll<NodeLeaf>(queryOptions, {
            transaction,
            resultClass: NodeLeaf,
        });

        // reset the query and values
        this._query = {
            SELECT: nodeLeafQuery,
            VALUES: resetValues
        }

        if (results.isError) {
            return Promise.resolve(Result.Pass(results));
        }

        return Promise.resolve(results);
    }

    async listAllToFile(fileOptions: FileOptions, queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<File>> {
        // store the first three values for re-initialization after list function is complete
        const resetValues = this._query.VALUES.slice(0, 3);

        const results = await super.findAllToFile(fileOptions, queryOptions, {
            transaction,
            resultClass: NodeLeaf,
        });

        // reset the query and values
        this._query = {
            SELECT: nodeLeafQuery,
            VALUES: resetValues
        }

        if (results.isError) {
            return Promise.resolve(Result.Pass(results));
        }

        return Promise.resolve(results);
    }
}
