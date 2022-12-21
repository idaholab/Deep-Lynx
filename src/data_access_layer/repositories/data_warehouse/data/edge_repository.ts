/* eslint-disable @typescript-eslint/no-floating-promises */
import RepositoryInterface, {FileOptions, QueryOptions, Repository} from '../../repository';
import Result from '../../../../common_classes/result';
import {PoolClient} from 'pg';
import {User} from '../../../../domain_objects/access_management/user';
import Logger from '../../../../services/logger';
import Edge from '../../../../domain_objects/data_warehouse/data/edge';
import EdgeMapper from '../../../mappers/data_warehouse/data/edge_mapper';
import Node from '../../../../domain_objects/data_warehouse/data/node';
import MetatypeRelationshipPairRepository from '../ontology/metatype_relationship_pair_repository';
import NodeRepository from './node_repository';
import File, {EdgeFile} from '../../../../domain_objects/data_warehouse/data/file';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import QueryStream from 'pg-query-stream';
import {EdgeConnectionParameter} from '../../../../domain_objects/data_warehouse/etl/type_transformation';
import {valueCompare} from '../../../../services/utilities';
import {instanceToPlain, plainToInstance} from 'class-transformer';

/*
    EdgeRepository contains methods for persisting and retrieving edges
    to storage as well as managing things like relationship validation and management.
    Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning.
 */
export default class EdgeRepository extends Repository implements RepositoryInterface<Edge> {
    #mapper: EdgeMapper = EdgeMapper.Instance;
    #fileMapper: FileMapper = FileMapper.Instance;
    #nodeRepo: NodeRepository = new NodeRepository();
    #pairRepo: MetatypeRelationshipPairRepository = new MetatypeRelationshipPairRepository();

    constructor() {
        super(EdgeMapper.viewName);
    }

    delete(e: Edge): Promise<Result<boolean>> {
        if (e.id) {
            return this.#mapper.Delete(e.id);
        }

        return Promise.resolve(Result.Failure('edge must have id'));
    }

    async findByID(id: string, transaction?: PoolClient): Promise<Result<Edge>> {
        const edge = await this.#mapper.Retrieve(id, transaction);
        if (!edge.isError) {
            const pair = await this.#pairRepo.findByID(edge.value.relationship_pair_id);
            if (pair.isError) Logger.error(`unable to load node's metatype`);
            else Object.assign(edge.value.metatypeRelationshipPair!, pair.value);
        }

        return Promise.resolve(edge);
    }

    async findByRelationship(origin: string, relationship: string, destination: string, transaction?: PoolClient): Promise<Result<Edge[]>> {
        return this.#mapper.RetrieveByRelationship(origin, relationship, destination, transaction);
    }

    async save(e: Edge, user: User, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction = false;
        const errors = await e.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`edge does not pass validation ${errors.join(',')}`));

        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate db transaction'));

            transaction = newTransaction.value;
            internalTransaction = true;
        }

        // fetch the relationship pair - have it load its relationships as well so
        // that we can validate the edge's properties against the relationship's keys
        const metatypeRelationshipPair = await this.#pairRepo.findByID(e.relationship_pair_id, true);
        if (metatypeRelationshipPair.isError) {
            if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
            return Promise.resolve(Result.Pass(metatypeRelationshipPair));
        }

        e.metatypeRelationshipPair = metatypeRelationshipPair.value;

        const validPayload = await e.metatypeRelationshipPair.relationship!.validateAndTransformProperties(e.properties);
        if (validPayload.isError) {
            if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
            return Promise.resolve(Result.Failure(`edges's properties do no match declared relationship type: ${e.metatypeRelationshipPair.name}`));
        }

        // replace the properties with the validated and transformed payload
        e.properties = validPayload.value;

        if (e.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(e.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, e);

            const updated = await this.#mapper.Update(user.id!, original.value, transaction);
            if (updated.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`unable to update edge ${updated.error?.error}`));
            }

            Object.assign(e, updated.value);
        } else {
            const validRelationship = await this.validateRelationship(e, transaction);
            if (validRelationship.isError || !validRelationship.value) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`invalid relationship for edge ${validRelationship.error?.error}`));
            }

            const created = await this.#mapper.Create(user.id!, e, transaction);
            if (created.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`unable to create edge ${created.error?.error}`));
            }

            Object.assign(e, created.value);
        }

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        return Promise.resolve(Result.Success(true));
    }

    async bulkSave(user: User | string, edges: Edge[], transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction = false;
        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate db transaction'));

            transaction = newTransaction.value;
            internalTransaction = true;
        }

        const operations: Promise<Result<boolean>>[] = [];
        const toCreate: Edge[] = [];
        const toUpdate: Edge[] = [];
        const toReturn: Edge[] = [];

        // we try to do as much of the initial processing in parallel as we can
        // while it's almost a pyramid of death, this allows us to decrease processing
        // time by a significant amount
        // eslint-disable-next-line @typescript-eslint/no-for-in-array
        for (const i in edges) {
            operations.push(
                new Promise((resolve) => {
                    edges[i]
                        .validationErrors()
                        .then((errors) => {
                            if (errors) {
                                resolve(Result.Failure(`validation for one or more edges failed ${errors.join(',')}`));
                                return;
                            }

                            // find and load the pair along with relationships so we can do property validation
                            this.#pairRepo
                                .findByID(edges[i].relationship_pair_id, true)
                                .then((pair) => {
                                    if (pair.isError) {
                                        resolve(Result.Failure(`unable fetch relationship pair for edge ${pair.error?.error}`));
                                        return;
                                    }

                                    edges[i].metatypeRelationshipPair = pair.value;

                                    edges[i]
                                        .metatypeRelationshipPair!.relationship!.validateAndTransformProperties(edges[i].properties)
                                        .then((transformed) => {
                                            if (transformed.isError) {
                                                resolve(Result.Failure(`unable to validate properties for edge: ${transformed.error?.error}`));
                                                return;
                                            }

                                            edges[i].properties = transformed.value;

                                            this.validateRelationship(edges[i], transaction)
                                                .then((valid) => {
                                                    if (valid.isError) {
                                                        resolve(Result.Failure(valid.error?.error!));
                                                        return;
                                                    }

                                                    resolve(Result.Success(true));
                                                })
                                                .catch((error) => resolve(Result.Failure(`unable to validate relationships for edge ${error}`)));
                                        })
                                        .catch((error) => resolve(Result.Failure(`unable to validate properties for edge ${error}`)));
                                })
                                .catch((error) => resolve(Result.Failure(`unable to fetch relationship pair for edge ${error}`)));
                        })
                        .catch((error) => resolve(Result.Failure(`validation for one or more edges failed ${error}`)));
                }),
            );

            edges[i].id ? toUpdate.push(edges[i]) : toCreate.push(edges[i]);
        }

        const completed = await Promise.all(operations);

        for (const complete of completed) {
            if (complete.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`one or more edges failed validation or property transformation ${complete.error?.error}`));
            }
        }

        if (toUpdate.length > 0) {
            const saved = await this.#mapper.BulkUpdate(user instanceof User ? user.id! : user, edges, transaction);
            if (saved.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(saved));
            }

            toReturn.push(...saved.value);
        }

        if (toCreate.length > 0) {
            const saved = await this.#mapper.BulkCreate(user instanceof User ? user.id! : user, edges, transaction);
            if (saved.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(saved));
            }

            toReturn.push(...saved.value);
        }

        toReturn.forEach((result, i) => {
            Object.assign(edges[i], result);
        });

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        return Promise.resolve(Result.Success(true));
    }

    /*
     validateRelationship validates whether the edge can be created between two nodes - this checks
     nodes' metatypes against the proposed relationship type and if existing relationships
     would violate a one:many or one:one clause - because this is validation only, we don't
     attempt to roll back a transaction if it exists - but we do have to use it
     as the nodes we're validating against might have been inserted earlier as part
     of the transaction
     */
    private async validateRelationship(e: Edge, transaction?: PoolClient): Promise<Result<boolean>> {
        let origin: Node;
        if (e.origin_id) {
            const request = await this.#nodeRepo.findByID(e.origin_id, transaction);
            if (request.isError) {
                return Promise.resolve(Result.Failure('origin node not found'));
            }

            origin = request.value;
        } else if (e.origin_original_id && e.origin_data_source_id && e.origin_metatype_id) {
            const request = await this.#nodeRepo.findByCompositeID(e.origin_original_id, e.origin_data_source_id, e.origin_metatype_id, transaction);
            if (request.isError) {
                return Promise.resolve(Result.Failure('origin node not found'));
            }

            origin = request.value;
            e.origin_id = request.value.id!;
        } else if (e.origin_original_id && e.data_source_id && e.origin_metatype_id) {
            const request = await this.#nodeRepo.findByCompositeID(e.origin_original_id, e.data_source_id, e.origin_metatype_id, transaction);
            if (request.isError) {
                return Promise.resolve(Result.Failure('origin node not found'));
            }

            origin = request.value;
            e.origin_id = request.value.id!;
        } else {
            return Promise.resolve(Result.Failure('no origin node id or original node id with metatype and data source provided'));
        }

        let destination: Node;
        if (e.destination_id) {
            const request = await this.#nodeRepo.findByID(e.destination_id, transaction);
            if (request.isError) {
                return Promise.resolve(Result.Failure('destination node not found'));
            }

            destination = request.value;
        } else if (e.destination_original_id && e.destination_data_source_id && e.destination_metatype_id) {
            const request = await this.#nodeRepo.findByCompositeID(
                e.destination_original_id,
                e.destination_data_source_id,
                e.destination_metatype_id,
                transaction,
            );
            if (request.isError) {
                return Promise.resolve(Result.Failure('origin node not found'));
            }

            destination = request.value;
            e.destination_id = request.value.id!;
        } else if (e.destination_original_id && e.data_source_id && e.destination_metatype_id) {
            const request = await this.#nodeRepo.findByCompositeID(e.destination_original_id, e.data_source_id, e.destination_metatype_id, transaction);
            if (request.isError) {
                return Promise.resolve(Result.Failure('destination node not found'));
            }

            destination = request.value;
            e.destination_id = request.value.id!;
        } else {
            return Promise.resolve(Result.Failure('no destination node id or original node idea with metatype and data source provided'));
        }

        if (
            e.metatypeRelationshipPair!.origin_metatype_id !== origin.metatype_id ||
            e.metatypeRelationshipPair!.destination_metatype_id !== destination.metatype_id
        ) {
            return Promise.resolve(Result.Failure('origin and destination node types do not match relationship pair'));
        }

        return Promise.resolve(Result.Success(true));
    }

    // populateFromParameters takes an edge record contains parameters and generates edges to be inserted based on those
    // filters
    async populateFromParameters(e: Edge): Promise<Result<Edge[]>> {
        const edges: Edge[] = [];

        // if we already have id's or original id's set, then return a new instance of the edge
        if ((e.origin_id && e.destination_id) || (e.origin_original_id && e.destination_original_id)) {
            edges.push(plainToInstance(Edge, {...instanceToPlain(e)}));
            return Promise.resolve(Result.Success(edges));
        }

        // if we have no filters, simply return the array
        if (!e.origin_parameters || e.origin_parameters.length === 0 || !e.destination_parameters || e.destination_parameters.length === 0) {
            return Promise.resolve(Result.Success(edges));
        }

        const originNodes = await this.parametersRepoBuilder(e.container_id!, e.origin_parameters).list(false);
        if (originNodes.isError) return Promise.resolve(Result.Pass(originNodes));

        const destNodes = await this.parametersRepoBuilder(e.container_id!, e.destination_parameters).list(false);
        if (destNodes.isError) return Promise.resolve(Result.Pass(destNodes));

        originNodes.value.forEach((origin) => {
            destNodes.value.forEach((dest) => {
                const newEdge: Edge = plainToInstance(Edge, {...instanceToPlain(e)});
                newEdge.origin_id = origin.id;
                newEdge.destination_id = dest.id;
                newEdge.origin_parameters = undefined;
                newEdge.destination_parameters = undefined;

                edges.push(newEdge);
            });
        });

        return Promise.resolve(Result.Success(edges));
    }

    private parametersRepoBuilder(containerID: string, parameters: EdgeConnectionParameter[]): NodeRepository {
        let nodeRepo = new NodeRepository().where().containerID('eq', containerID);

        // **NOTE** for now we are just going to do equality on the operators, no matter what the filter might say
        // this is because the UI will default to equality for now and it helps cut down our calls to listing nodes
        // which might be a considerably expensive call
        parameters.forEach((p) => {
            switch (p.type) {
                case 'data_source': {
                    nodeRepo = nodeRepo.and().dataSourceID(p.operator!, p.value);
                    break;
                }

                case 'metatype_id': {
                    nodeRepo = nodeRepo.and().metatypeID(p.operator!, p.value);
                    break;
                }

                case 'metatype_uuid': {
                    nodeRepo = nodeRepo.and().metatypeUUID(p.operator!, p.value);
                    break;
                }

                case 'metatype_name': {
                    nodeRepo = nodeRepo.and().metatypeName(p.operator!, p.value);
                    break;
                }

                case 'original_id': {
                    nodeRepo = nodeRepo.and().originalDataID(p.operator!, p.value);
                    break;
                }

                case 'property': {
                    nodeRepo = nodeRepo.and().property(p.property!, p.operator!, p.value);
                    break;
                }

                case 'id': {
                    nodeRepo = nodeRepo.and().id(p.operator!, p.value);
                    break;
                }
            }
        });

        return nodeRepo;
    }

    addFile(edge: Edge, fileID: string): Promise<Result<boolean>> {
        if (!edge.id) {
            return Promise.resolve(Result.Failure('edge must have id'));
        }

        return this.#mapper.AddFile(edge.id, fileID);
    }

    bulkAddFiles(edge: Edge, fileIDs: string[], transaction?: PoolClient): Promise<Result<EdgeFile[]>> {
        if (!edge.id) {
            return Promise.resolve(Result.Failure('edge must have id'));
        }

        const edgeFiles: EdgeFile[] = [];

        fileIDs.forEach((id) => edgeFiles.push(new EdgeFile({edge_id: edge.id!, file_id: id})));

        return this.#mapper.BulkAddFile(edgeFiles, transaction);
    }

    removeFile(edge: Edge, fileID: string): Promise<Result<boolean>> {
        if (!edge.id) {
            return Promise.resolve(Result.Failure('edge must have id'));
        }

        return this.#mapper.RemoveFile(edge.id, fileID);
    }

    listFiles(edge: Edge): Promise<Result<File[]>> {
        if (!edge.id) {
            return Promise.resolve(Result.Failure('edge must have id'));
        }

        return this.#fileMapper.ListForEdge(edge.id);
    }

    id(operator: string, value: any) {
        super.query('id', operator, value);
        return this;
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
        return this;
    }

    relationshipPairID(operator: string, value: any) {
        super.query('relationship_pair_id', operator, value);
        return this;
    }

    relationshipName(operator: string, value: any) {
        super.query('metatype_relationship_name', operator, value);
        return this;
    }

    dataSourceID(operator: string, value: any) {
        super.query('data_source_id', operator, value);
        return this;
    }

    importDataID(operator: string, value: any) {
        super.query('import_data_id', operator, value);
        return this;
    }

    property(key: string, operator: string, value: any, dataType?: string) {
        super.queryJsonb(key, 'properties', operator, value, {dataType});
        return this;
    }

    origin_node_id(operator: string, value: any) {
        super.query('origin_id', operator, value);
        return this;
    }

    destination_node_id(operator: string, value: any) {
        super.query('destination_id', operator, value);
        return this;
    }

    origin_original_id(operator: string, value: any) {
        super.query('origin_original_id', operator, value);
        return this;
    }

    destination_original_id(operator: string, value: any) {
        super.query('destination_original_id', operator, value);
        return this;
    }

    metatypeRelationshipUUID(operator: string, value: any) {
        super.query('metatype_relationship_uuid', operator, value);
        return this;
    }

    originMetatypeUUID(operator: string, value: any) {
        super.query('origin_metatype_uuid', operator, value);
        return this;
    }

    destinationMetatypeUUID(operator: string, value: any) {
        super.query('destination_metatype_uuid', operator, value);
        return this;
    }

    async count(transaction?: PoolClient, queryOptions?: QueryOptions): Promise<Result<number>> {
        const results = await super.count(transaction, queryOptions);

        if (results.isError) return Promise.resolve(Result.Pass(results));
        return Promise.resolve(Result.Success(results.value));
    }

    async list(loadRelationshipPairs?: boolean, queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<Edge[]>> {
        const results = await super.findAll<Edge>(queryOptions, {
            transaction,
            resultClass: Edge,
        });

        if (results.isError) return Promise.resolve(Result.Pass(results));

        if (loadRelationshipPairs) {
            await Promise.all(
                results.value.map((edge) => {
                    return new Promise((resolve) => {
                        this.#pairRepo.findByID(edge.relationship_pair_id).then((pair) => {
                            if (pair.isError) {
                                resolve(Result.Failure(`unable to load node's metatypes ${pair.error?.error}`));
                                return;
                            }

                            edge.metatypeRelationshipPair = pair.value;
                            resolve(Result.Success(true));
                        });
                    });
                }),
            );
        }

        return Promise.resolve(Result.Success(results.value));
    }

    //  listStreaming will not autopopulate the metatype relationship pairs that are referenced, users must do that
    // and the type casting themselves
    listStreaming(queryOptions?: QueryOptions, transaction?: PoolClient): Promise<QueryStream> {
        return super.findAllStreaming(queryOptions, {
            transaction,
        });
    }

    listAllToFile(fileOptions: FileOptions, queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<File>> {
        if (fileOptions.file_type === 'parquet' && !fileOptions.parquet_schema) {
            fileOptions.parquet_schema = {
                id: {type: 'INT64'},
                container_id: {type: 'INT64'},
                relationship_pair_id: {type: 'INT64'},
                metatype_relationship_name: {type: 'UTF8'},
                properties: {type: 'JSON'},
                import_data_id: {type: 'INT64', optional: true},
                data_staging_id: {type: 'INT64', optional: true},
                data_source_id: {type: 'INT64', optional: true},
                type_mapping_transformation_id: {type: 'INT64', optional: true},
                origin_id: {type: 'INT64'},
                destination_id: {type: 'INT64'},
                metadata: {type: 'JSON', optional: true},
                created_at: {type: 'TIMESTAMP_MILLIS'},
                created_by: {type: 'INT64'},
                modified_at: {type: 'TIMESTAMP_MILLIS'},
                modified_by: {type: 'INT64', optional: true},
                deleted_at: {type: 'TIMESTAMP_MILLIS', optional: true},
            };
        }

        return super.findAllToFile(fileOptions, queryOptions, {transaction});
    }
}
