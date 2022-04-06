/* eslint-disable @typescript-eslint/no-floating-promises */
import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
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
        if (errors) return Promise.resolve(Result.Failure(`node does not pass validation ${errors.join(',')}`));

        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiated db transaction'));

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
        for (const edge of edges) {
            operations.push(
                new Promise((resolve) => {
                    edge.validationErrors()
                        .then((errors) => {
                            if (errors) {
                                resolve(Result.Failure(`validation for one or more edges failed ${errors.join(',')}`));
                                return;
                            }

                            // find and load the pair along with relationships so we can do property validation
                            this.#pairRepo
                                .findByID(edge.relationship_pair_id, true)
                                .then((pair) => {
                                    if (pair.isError) {
                                        resolve(Result.Failure(`unable fetch relationship pair for edge ${pair.error?.error}`));
                                        return;
                                    }

                                    edge.metatypeRelationshipPair = pair.value;

                                    edge.metatypeRelationshipPair
                                        .relationship!.validateAndTransformProperties(edge.properties)
                                        .then((transformed) => {
                                            if (transformed.isError) {
                                                resolve(Result.Failure(`unable to validate properties for edge: ${transformed.error?.error}`));
                                                return;
                                            }

                                            edge.properties = transformed.value;

                                            resolve(Result.Success(true));

                                            /* TODO: This needs completely rethought as we can possibly create the edge before the nodes
                                            this.validateRelationship(edge, transaction)
                                                .then((valid) => {
                                                    if (valid.isError) {
                                                        resolve(Result.Failure(valid.error?.error!));
                                                        return;
                                                    }

                                                    resolve(Result.Success(true));
                                                })
                                                .catch((error) => resolve(Result.Failure(`unable to validate relationships for edge ${error}`)));
                                             */
                                        })
                                        .catch((error) => resolve(Result.Failure(`unable to validate properties for edge ${error}`)));
                                })
                                .catch((error) => resolve(Result.Failure(`unable to fetch relationship pair for edge ${error}`)));
                        })
                        .catch((error) => resolve(Result.Failure(`validation for one or more edges failed ${error}`)));
                }),
            );

            edge.id ? toUpdate.push(edge) : toCreate.push(edge);
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
     validateRelationship validates whether or not the edge can be created between two nodes - this checks
     nodes' metatypes against the proposed relationship type and if existing relationships
     would violate a one:many or one:one clause - because this is validation only, we don't
     attempt to rollback a transaction if it exists - but we do have to use it
     as the nodes we're validating against might have been inserted earlier as part
     of the transaction - NOTE: if an edge is created using the original data id, the most this
     function will do is test to make sure all fields required to make a link exist. If those exist
     and a matching node is not found, this function WILL NOT FAIL - and an edge-linker job will
     attempt to make the connection later
     */
    private async validateRelationship(e: Edge, transaction?: PoolClient): Promise<Result<boolean>> {
        let origin: Node;
        if (e.origin_id) {
            const request = await this.#nodeRepo.findByID(e.origin_id, transaction);
            if (request.isError) {
                return Promise.resolve(Result.Failure('origin node not found'));
            }

            origin = request.value;
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

        // Note: At one point we also checked to see if the current relationship
        // between the two proposed nodes existed. We thought that this would help
        // cut down onA duplicates. However, it turns out that various services might
        // create the same relationship between two nodes all the time - such as
        // sensor data - and that attempting to tell apart what is an accidental
        // edge creation vs. what is purposeful is doomed to fail. We have to put
        // the burden on the users to ensure they're sending the right data, we can't
        // have DL make assumptions about the data. However, we can still verify that
        // we're not making new edges when doing so would violate a clause like one:one
        // we just have to be careful how we build our query and to ignore something
        // that already exits if it shares the same ID
        let destinationQuery = new EdgeRepository() // new repository to avoid corrupting the filter
            .where()
            .destination_node_id('eq', destination.id!)
            .and()
            .relationshipPairID('eq', e.metatypeRelationshipPair!.id!);

        let originQuery = new EdgeRepository() // new repository to avoid corrupting the filter
            .where()
            .origin_node_id('eq', origin.id!)
            .and()
            .relationshipPairID('eq', e.metatypeRelationshipPair!.id!);

        if (e.id) {
            destinationQuery = destinationQuery.and().id('eq', e.id);
            originQuery = originQuery.and().id('eq', e.id);
        }

        const destinationRelationships = await destinationQuery.count();
        const originRelationships = await originQuery.count();

        switch (e.metatypeRelationshipPair!.relationship_type) {
            // we don't need to check a many:many as we don't have to verify more than whether or not the origin
            // and destination types match
            case 'many:many': {
                break;
            }

            case 'one:one': {
                if (!destinationRelationships.isError && destinationRelationships.value > 0) {
                    return Promise.resolve(
                        Result.Failure(
                            `proposed relationship of type: ${e.metatypeRelationshipPair!.relationship_id} between ${origin.id} and ${
                                destination.id
                            } violates the one:one relationship constraint`,
                        ),
                    );
                }

                if (!originRelationships.isError && originRelationships.value > 0) {
                    return Promise.resolve(
                        Result.Failure(
                            `proposed relationship of type: ${e.metatypeRelationshipPair!.relationship_id} between ${origin.id} and ${
                                destination.id
                            } violates the one:one relationship constraint`,
                        ),
                    );
                }

                break;
            }

            case 'one:many': {
                if (!destinationRelationships.isError && destinationRelationships.value > 0) {
                    return Promise.resolve(
                        Result.Failure(
                            `proposed relationship of type: ${e.metatypeRelationshipPair!.relationship_id} between ${origin.id} and ${
                                destination.id
                            } violates the one:many relationship constraint`,
                        ),
                    );
                }

                break;
            }

            case 'many:one': {
                if (!originRelationships.isError && originRelationships.value > 0) {
                    return Promise.resolve(
                        Result.Failure(
                            `proposed relationship of type: ${e.metatypeRelationshipPair!.relationship_id} between ${origin.id} and ${
                                destination.id
                            } violates the many:one relationship constraint`,
                        ),
                    );
                }

                break;
            }
        }

        return Promise.resolve(Result.Success(true));
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
        super.queryJsonb(key, 'properties', operator, value, dataType);
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
}
