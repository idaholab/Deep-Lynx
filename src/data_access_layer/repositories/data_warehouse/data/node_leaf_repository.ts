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
        super('');
        // in order to add filters to the base node leaf query we must set it
        // as the raw query here
        this._rawQuery = [nodeLeafQuery];
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
        const resetValues = this._values.slice(0, 3);

        const results = await super.findAll<NodeLeaf>(queryOptions, {
            transaction,
            resultClass: NodeLeaf,
        });

        // reset the query
        this._rawQuery = [nodeLeafQuery];
        // reset the values to correspond with reset query
        this._values = resetValues;

        if (results.isError) {
            return Promise.resolve(Result.Pass(results));
        }

        return Promise.resolve(results);
    }

    async listAllToFile(fileOptions: FileOptions, queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<File>> {
        // store the first three values for re-initialization after list function is complete
        const resetValues = this._values.slice(0, 3);

        const results = await super.findAllToFile(fileOptions, queryOptions, {
            transaction,
            resultClass: NodeLeaf,
        });
        // reset the query
        this._rawQuery = [nodeLeafQuery];
        // reset the values to correspond with reset query
        this._values = resetValues;

        if (results.isError) {
            return Promise.resolve(Result.Pass(results));
        }

        return Promise.resolve(results);
    }
}
