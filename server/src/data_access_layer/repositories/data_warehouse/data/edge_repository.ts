/* eslint-disable @typescript-eslint/no-floating-promises */
import RepositoryInterface, {FileOptions, QueryOptions, Repository} from '../../repository';
import Result from '../../../../common_classes/result';
import {PoolClient} from 'pg';
import {User} from '../../../../domain_objects/access_management/user';
import Logger from '../../../../services/logger';
import Edge from '../../../../domain_objects/data_warehouse/data/edge';
import EdgeMapper from '../../../mappers/data_warehouse/data/edge_mapper';
import MetatypeRelationshipPairRepository from '../ontology/metatype_relationship_pair_repository';
import NodeRepository from './node_repository';
import File, {EdgeFile} from '../../../../domain_objects/data_warehouse/data/file';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import QueryStream from 'pg-query-stream';
import {EdgeConnectionParameter} from '../../../../domain_objects/data_warehouse/etl/type_transformation';
import {instanceToPlain, plainToInstance} from 'class-transformer';
import {SnapshotGenerator} from 'deeplynx';

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
    useView = false;

    // generic option allows us to skip view-like setup
    constructor(useView = false) {
        super(useView ? EdgeMapper.viewName : EdgeMapper.tableName);
        this.useView = useView;
        this.reset();
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

    async findEdgeHistoryByID(id: string, includeRawData: boolean, transaction?: PoolClient): Promise<Result<Edge[]>> {
        const edges =
            includeRawData === true ? await this.#mapper.RetrieveRawDataHistory(id, transaction) : await this.#mapper.RetrieveHistory(id, transaction);

        if (edges.isError) {
            return Promise.reject(edges.error);
        }

        return Promise.resolve(edges);
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
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${JSON.stringify(original.error)}`));

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

    async bulkSave(user: User | string, edges: Edge[], returnEdges = false, transaction?: PoolClient): Promise<Result<boolean | Edge[]>> {
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
                                                        resolve(Result.Failure(valid.error?.error));
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

        return returnEdges ? Promise.resolve(Result.Success(toReturn)) : Promise.resolve(Result.Success(true));
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
        // TODO: figure out a way to validate relationships that doesn't include hammering the database
        // validateCreatedAtDate() shouldn't be used until we resolve the comments above - transaction
        // handling will need to be added for created date as well
        // this.validateCreatedAtDate(e, transaction);
        return Promise.resolve(Result.Success(true));
    }

    /*
        Eventually we'll want to be validating the created at date by ensuring that the new created_at date is
        newer than both the origin and destination node. However, due to performance issues we aren't doing any
        edge validation on the relationships. So putting this function in as a 'description of what needs to happen,
        but until we refactor or find a way to not need to hit the db multiple times per edge for node-lookups this
        should remain un-called.
    */
    private async validateCreatedAtDate(e: Edge, transaction?: PoolClient): Promise<Result<boolean>> {
        this.#nodeRepo.findByID(e.origin_id!).then((nodeResult) => {
            const origin_created_at = nodeResult.value.created_at!;

            this.#nodeRepo.findByID(e.destination_id!).then((nodeResult) => {
                const destination_created_at = nodeResult.value.created_at!;
                const useDestination = origin_created_at > destination_created_at;
                let isValid = false;
                if (useDestination) isValid = e.created_at! > destination_created_at;
                else isValid = e.created_at! > origin_created_at;

                if (isValid) return Promise.resolve(Result.Success(true));
            });
        });

        return Promise.resolve(Result.Failure(': the edge created date must be after the created date of both connected nodes.'));
    }

    // populateFromParameters takes an edge record contains parameters and generates edges to be inserted based on those
    // filters
    async populateFromParameters(e: Edge, snapshot?: SnapshotGenerator): Promise<Result<Edge[]>> {
        const edges: Edge[] = [];

        // if we already have id's or original id's set, then return a new instance of the edge
        if (e.origin_id && e.destination_id) {
            edges.push(plainToInstance(Edge, {...instanceToPlain(e)}));
            return Promise.resolve(Result.Success(edges));
        }

        if (
            e.origin_original_id &&
            e.destination_original_id &&
            (!e.origin_parameters || e.origin_parameters.length === 0 || !e.destination_parameters || e.destination_parameters.length === 0)
        ) {
            const originNodes = await new NodeRepository()
                .where()
                .containerID('eq', e.container_id)
                .and()
                .dataSourceID('eq', e.origin_data_source_id)
                .and()
                .originalDataID('eq', e.origin_original_id)
                .list(false);
            if (originNodes.isError) return Promise.resolve(Result.Pass(originNodes));

            const destNodes = await new NodeRepository()
                .where()
                .containerID('eq', e.container_id)
                .and()
                .dataSourceID('eq', e.destination_data_source_id)
                .and()
                .originalDataID('eq', e.destination_original_id)
                .list(false);
            if (destNodes.isError) return Promise.resolve(Result.Pass(destNodes));

            originNodes.value.forEach((origin) => {
                destNodes.value.forEach((dest) => {
                    const newEdge: Edge = plainToInstance(Edge, {...instanceToPlain(e)});
                    newEdge.origin_id = origin.id;
                    newEdge.destination_id = dest.id;

                    // we need to fill in the columns that allow us to keep edges across node versions
                    newEdge.origin_data_source_id = origin.data_source_id;
                    newEdge.origin_metatype_id = origin.metatype_id;
                    newEdge.destination_data_source_id = dest.data_source_id;
                    newEdge.origin_original_id = origin.original_data_id;
                    newEdge.destination_metatype_id = origin.metatype_id;
                    newEdge.destination_original_id = dest.original_data_id;

                    edges.push(newEdge);
                });
            });

            return Promise.resolve(Result.Success(edges));
        }

        // if we have no filters, simply return the array
        if (!e.origin_parameters || e.origin_parameters.length === 0 || !e.destination_parameters || e.destination_parameters.length === 0) {
            return Promise.resolve(Result.Success(edges));
        }

        // if any of the parameters have the "like" filter, we have to use the old method vs. the rust snapshot
        if (e.origin_parameters.filter((p) => p.operator === 'like').length > 0 || e.destination_parameters.filter((p) => p.operator === 'like').length > 0) {
            const originNodes = await this.parametersRepoBuilder(e.container_id!, e.origin_parameters).list(false);
            if (originNodes.isError) return Promise.resolve(Result.Pass(originNodes));

            const destNodes = await this.parametersRepoBuilder(e.container_id!, e.destination_parameters).list(false);
            if (destNodes.isError) return Promise.resolve(Result.Pass(destNodes));

            originNodes.value.forEach((origin) => {
                destNodes.value.forEach((dest) => {
                    const newEdge: Edge = plainToInstance(Edge, {...instanceToPlain(e)});
                    newEdge.origin_id = origin.id;
                    newEdge.destination_id = dest.id;

                    // we need to fill in the columns that allow us to keep edges across node versions
                    newEdge.origin_data_source_id = origin.data_source_id;
                    newEdge.origin_metatype_id = origin.metatype_id;
                    newEdge.destination_data_source_id = dest.data_source_id;
                    newEdge.origin_original_id = origin.original_data_id;
                    newEdge.destination_original_id = dest.original_data_id;
                    newEdge.destination_metatype_id = dest.metatype_id;

                    edges.push(newEdge);
                });
            });
        } else {
            // use the snapshot to build the edges to insert - a backfill statement will take care off building
            // the rest of the values later
            try {
                const origin_ids: string[] = await snapshot!.findNodes(JSON.stringify(e.origin_parameters));
                const destination_ids: string[] = await snapshot!.findNodes(JSON.stringify(e.destination_parameters));

                // if we have property filters, we need to basically do what we do above and filter by ids - this is
                // because currently the rust method doesn't do more than a value match on the whole json string
                if (
                    e.origin_parameters.filter((p) => p.type === 'property').length > 0 ||
                    e.destination_parameters.filter((p) => p.type !== 'property').length > 0
                ) {
                    let originNodes;
                    if (origin_ids.length > 0) {
                        originNodes = await this.parametersRepoBuilder(e.container_id!, e.origin_parameters).and().id('in', origin_ids).list(false);
                    } else {
                        // if no origin_ids were supplied, return an empty array
                        originNodes = await this.parametersRepoBuilder(e.container_id!, e.origin_parameters).list(false);
                    }
                    if (originNodes.isError) return Promise.resolve(Result.Pass(originNodes));

                    let destNodes;
                    if (destination_ids.length > 0) {
                        destNodes = await this.parametersRepoBuilder(e.container_id!, e.destination_parameters).and().id('in', destination_ids).list(false);
                    } else {
                        // if no destination_ids were supplied, return an empty array
                        destNodes = await this.parametersRepoBuilder(e.container_id!, e.destination_parameters).list(false);
                    }
                    if (destNodes.isError) return Promise.resolve(Result.Pass(destNodes));

                    originNodes.value.forEach((origin) => {
                        destNodes.value.forEach((dest) => {
                            const newEdge: Edge = plainToInstance(Edge, {...instanceToPlain(e)});
                            newEdge.origin_id = origin.id;
                            newEdge.destination_id = dest.id;

                            // we need to fill in the columns that allow us to keep edges across node versions
                            newEdge.origin_data_source_id = origin.data_source_id;
                            newEdge.origin_metatype_id = origin.metatype_id;
                            newEdge.destination_data_source_id = dest.data_source_id;
                            newEdge.origin_original_id = origin.original_data_id;
                            newEdge.destination_original_id = dest.original_data_id;
                            newEdge.destination_metatype_id = dest.metatype_id;

                            edges.push(newEdge);
                        });
                    });
                } else {
                    origin_ids.forEach((origin) => {
                        destination_ids.forEach((dest) => {
                            const newEdge: Edge = plainToInstance(Edge, {...instanceToPlain(e)});
                            newEdge.origin_id = origin;
                            newEdge.destination_id = dest;
                            edges.push(newEdge);
                        });
                    });
                }
            } catch (e: any) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                return Promise.resolve(Result.Failure(e));
            }
        }

        return Promise.resolve(Result.Success(edges));
    }

    private parametersRepoBuilder(containerID: string, parameters: EdgeConnectionParameter[]): NodeRepository {
        let nodeRepo = new NodeRepository().where().containerID('eq', containerID);

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
        super.query('name', operator, value, this.useView ? undefined : {tableName: 'metatype_relationships'});
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
        super.query('uuid', operator, value, this.useView ? undefined : {tableName: 'metatype_relationships'});
        return this;
    }

    originMetatypeUUID(operator: string, value: any) {
        super.query('uuid', operator, value, this.useView ? undefined : {tableAlias: 'origin'});
        return this;
    }

    destinationMetatypeUUID(operator: string, value: any) {
        super.query('uuid', operator, value, this.useView ? undefined : {tableAlias: 'destination'});
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

        this.reset();
        return Promise.resolve(Result.Success(results.value));
    }

    //  listStreaming will not autopopulate the metatype relationship pairs that are referenced, users must do that
    // and the type casting themselves
    listStreaming(queryOptions?: QueryOptions, transaction?: PoolClient): Promise<QueryStream> {
        return super.findAllStreaming(queryOptions, {
            transaction,
        });
    }

    async listAllToFile(fileOptions: FileOptions, queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<File>> {
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

        const results = await super.findAllToFile(fileOptions, queryOptions, {transaction});

        this.reset();
        return Promise.resolve(Result.Success(results.value));
    }

    reset() {
        super.reset(this.useView ? EdgeMapper.viewName : EdgeMapper.tableName);
        if (!this.useView) {
            // use the repo functions to recreate the current_edges view
            this.distinctOn(['origin_id', 'destination_id', 'data_source_id', 'relationship_pair_id'])
                .addFields({uuid: 'origin_metatype_uuid'}, 'origin')
                .addFields({uuid: 'destination_metatype_uuid'}, 'destination')
                .addFields(
                    {
                        relationship_id: 'relationship_id',
                        uuid: 'metatype_relationship_pair_uuid',
                    },
                    'pairs',
                )
                .addFields(
                    {
                        name: 'metatype_relationship_name',
                        uuid: 'metatype_relationship_uuid',
                    },
                    'relationships',
                )
                .join(
                    'metatype_relationship_pairs',
                    {origin_col: 'relationship_pair_id', destination_col: 'id'},
                    {destination_alias: 'pairs', join_type: 'INNER'},
                )
                .join('metatype_relationships', {origin_col: 'relationship_id', destination_col: 'id'}, {origin: 'pairs', destination_alias: 'relationships'})
                .join('metatypes', {origin_col: 'origin_metatype_id', destination_col: 'id'}, {origin: 'pairs', destination_alias: 'origin'})
                .join('metatypes', {origin_col: 'destination_metatype_id', destination_col: 'id'}, {origin: 'pairs', destination_alias: 'destination'})
                .where()
                .query('deleted_at', 'is null')
                .sortBy(['origin_id', 'destination_id', 'data_source_id', 'relationship_pair_id'])
                .sortBy('created_at', undefined, true);

            // combine all select-fields into one string in case of COUNT(*) replacement
            this._query.SELECT = [this._query.SELECT.join(', ')];
        }
    }
}
