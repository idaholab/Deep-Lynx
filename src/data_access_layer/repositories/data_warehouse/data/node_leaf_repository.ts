import {FileOptions, QueryOptions, Repository} from '../../repository';
import NodeLeaf, {getNodeLeafQuery} from '../../../../domain_objects/data_warehouse/data/node_leaf';
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
    // we need to save query inputs for when the query resets
    // since this is more complicated than your standard SELECT * query
    queryInputs: {id: string, container_id: string, depth: string, use_original_id?: boolean};

    constructor(id: string, container_id: string, depth: string, use_original_id?: boolean) {
        super('nodeleafs');
        // in order to add filters to the base node leaf query we must set it
        // as the raw query here
        this._noSelectRoot();
        this._query.SELECT = [getNodeLeafQuery(id, container_id, depth, use_original_id)];
        this._query.FROM = '';
        this._query.WHERE = [];
        this._tableAlias = 'nodeleafs';
        // store query inputs
        this.queryInputs = {id, container_id, depth, use_original_id};
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

    edgeDirection(operator: string, value: any) {
        super.query('nodeleafs.edge_direction', operator, value);
        return this;
    }

    async list(queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<NodeLeaf[]>> {
        const results = await super.findAll<NodeLeaf>(queryOptions, {
            transaction,
            resultClass: NodeLeaf,
        });

        // reset the query and values
        this._noSelectRoot();
        this._query.SELECT = [getNodeLeafQuery(
            this.queryInputs.id, this.queryInputs.container_id, this.queryInputs.depth, this.queryInputs.use_original_id
        )];
        this._query.FROM = '';
        this._query.WHERE = [];
        this._tableAlias = 'nodeleafs'

        if (results.isError) {
            return Promise.resolve(Result.Pass(results));
        }

        return Promise.resolve(results);
    }

    async listAllToFile(fileOptions: FileOptions, queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<File>> {
        const results = await super.findAllToFile(fileOptions, queryOptions, {
            transaction,
            resultClass: NodeLeaf,
        });

        // reset the query and values
        this._noSelectRoot();
        this._query.SELECT = [getNodeLeafQuery(
            this.queryInputs.id, this.queryInputs.container_id, this.queryInputs.depth, this.queryInputs.use_original_id
        )];
        this._query.FROM = '';
        this._query.WHERE = [];
        this._tableAlias = 'nodeleafs'

        if (results.isError) {
            return Promise.resolve(Result.Pass(results));
        }

        return Promise.resolve(results);
    }
}
