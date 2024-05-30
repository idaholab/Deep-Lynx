import RepositoryInterface, {FileOptions, QueryOptions, Repository} from '../../repository';
import Node from '../../../../domain_objects/data_warehouse/data/node';
import Result from '../../../../common_classes/result';
import NodeMapper from '../../../mappers/data_warehouse/data/node_mapper';
import {PoolClient} from 'pg';
import {User} from '../../../../domain_objects/access_management/user';
import MetatypeRepository from '../ontology/metatype_repository';
import Logger from '../../../../services/logger';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import File, {NodeFile} from '../../../../domain_objects/data_warehouse/data/file';
import QueryStream from 'pg-query-stream';
import {stringToValidPropertyName, valueCompare} from '../../../../services/utilities';
import DataSourceRepository from '../import/data_source_repository';
import {TimeseriesDataSourceConfig} from '../../../../domain_objects/data_warehouse/import/data_source';

/*
    NodeRepository contains methods for persisting and retrieving nodes
    to storage as well as managing things like validation.
    Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning.
 */
export default class NodeRepository extends Repository implements RepositoryInterface<Node> {
    #mapper: NodeMapper = NodeMapper.Instance;
    #fileMapper: FileMapper = FileMapper.Instance;
    #metatypeRepo: MetatypeRepository = new MetatypeRepository();
    useView = false;

    // generic option allows us to skip view-like setup
    constructor(useView = false) {
        super(useView ? NodeMapper.viewName : NodeMapper.tableName);
        this.useView = useView;
        this.reset();
    }

    delete(n: Node): Promise<Result<boolean>> {
        if (n.id) {
            return this.#mapper.Delete(n.id);
        }

        return Promise.resolve(Result.Failure('node must have id'));
    }

    async findByID(id: string, transaction?: PoolClient): Promise<Result<Node>> {
        const node = await this.#mapper.Retrieve(id, transaction);
        if (!node.isError) {
            const metatype = await this.#metatypeRepo.findByID(node.value.metatype_id);
            if (metatype.isError) Logger.error(`unable to load node's metatype`);
            else node.value.metatype = metatype.value;
        }

        return Promise.resolve(node);
    }

    async findNodeHistoryByID(id: string, includeRawData: boolean, transaction?: PoolClient): Promise<Result<Node[]>> {
        const nodes =
            includeRawData === true ? await this.#mapper.RetrieveRawDataHistory(id, transaction) : await this.#mapper.RetrieveHistory(id, transaction);

        if (nodes.isError) {
            return Promise.reject(nodes.error);
        }

        return Promise.resolve(nodes);
    }

    // composite id's are only unique when paired with a data source as well
    async findByCompositeID(id: string, dataSourceID: string, metatypeID: string, transaction?: PoolClient): Promise<Result<Node>> {
        const node = await this.#mapper.RetrieveByCompositeOriginalID(id, dataSourceID, metatypeID, transaction);
        if (!node.isError) {
            const metatype = await this.#metatypeRepo.findByID(node.value.metatype_id);
            if (metatype.isError) Logger.error(`unable to load node's metatype`);
            else node.value.metatype = metatype.value;
        }

        return Promise.resolve(node);
    }

    async save(n: Node, user: User, transaction?: PoolClient, merge = false): Promise<Result<boolean>> {
        let internalTransaction = false;
        const errors = await n.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`node does not pass validation ${errors.join(',')}`));

        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiated db transaction'));

            transaction = newTransaction.value;
            internalTransaction = true;
        }

        // the metatype should fetch with all its keys
        const metatype = await this.#metatypeRepo.findByID(n.metatype!.id!, true);
        if (metatype.isError) {
            if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
            return Promise.resolve(Result.Failure(`unable to retrieve node's metatype ${metatype.error?.error}`));
        }

        // we decided to keep the validation and transformation of object properties
        // on the metatype vs. pulling it into the node - as we might be performing
        // that validation/transformation elsewhere and we would always need the
        // metatype and it's keys anyways
        const validPayload = await metatype.value.validateAndTransformProperties(n.properties);
        if (validPayload.isError) {
            if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
            return Promise.resolve(
                Result.Failure(`node's properties do no match declared metatype: ${n.metatype_name} or validation failed: ${validPayload.error?.error}`),
            );
        }

        // replace the properties with the validated and transformed payload
        n.properties = validPayload.value;

        if (n.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(n.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, n);

            const results = await this.#mapper.Update(user.id!, original.value, undefined, merge);
            if (results.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(results));
            }

            if (results.value?.id) {
                Object.assign(n, results.value);
            }
        } else {
            const results = await this.#mapper.CreateOrUpdateByCompositeID(user.id!, n, undefined, merge);
            if (results.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(results));
            }

            if (results.value?.id) {
                Object.assign(n, results.value);
            }
        }

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        return Promise.resolve(Result.Success(true));
    }

    async bulkSave(user: User | string, nodes: Node[], transaction?: PoolClient, merge = false): Promise<Result<boolean>> {
        let internalTransaction = false;
        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiated db transaction'));

            transaction = newTransaction.value;
            internalTransaction = true;
        }

        const operations: Promise<Result<boolean>>[] = [];
        const toCreate: Node[] = [];
        const toUpdate: Node[] = [];
        const toReturn: Node[] = [];

        // we try to do as much of the initial processing in parallel as we can
        // while it's almost a pyramid of death, this allows us to decrease processing
        // time by a significant amount
        for (const node of nodes) {
            operations.push(
                new Promise((resolve) => {
                    node.validationErrors()
                        .then((errors) => {
                            if (errors) {
                                resolve(Result.Failure(`validation for one or more nodes failed ${errors.join(',')}`));
                                return;
                            }

                            this.#metatypeRepo
                                .findByID(node.metatype!.id!)
                                .then((metatype) => {
                                    if (metatype.isError) {
                                        resolve(Result.Failure(`unable fetch metatype for node ${metatype.error?.error}`));
                                        return;
                                    }

                                    node.metatype = metatype.value;

                                    // we decided to keep the validation and transformation of object properties
                                    // on the metatype vs. pulling it into the node - as we might be performing
                                    // that validation/transformation elsewhere and we would always need the
                                    // metatype and it's keys anyways
                                    metatype.value
                                        .validateAndTransformProperties(node.properties)
                                        .then((transformed) => {
                                            if (transformed.isError) {
                                                resolve(Result.Failure(`unable to validate properties for node: ${transformed.error?.error}`));
                                                return;
                                            }

                                            node.properties = transformed.value;
                                            resolve(Promise.resolve(Result.Success(true)));
                                        })
                                        .catch((error) => resolve(Result.Failure(`unable to validate properties for node ${error}`)));
                                })
                                .catch((error) => resolve(Result.Failure(`unable to fetch metatype for node ${error}`)));
                        })
                        .catch((error) => resolve(Result.Failure(`validation for one or more nodes failed ${error}`)));
                }),
            );

            node.id ? toUpdate.push(node) : toCreate.push(node);
        }

        const completed = await Promise.all(operations);

        for (const complete of completed) {
            if (complete.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`one or more nodes failed validation or property transformation ${complete.error?.error}`));
            }
        }

        if (toUpdate.length > 0) {
            const saved = await this.#mapper.BulkUpdate(user instanceof User ? user.id! : user, toUpdate, merge, transaction);
            if (saved.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(saved));
            }

            toReturn.push(...saved.value);
        }

        if (toCreate.length > 0) {
            const saved = await this.#mapper.BulkCreateOrUpdateByCompositeID(user instanceof User ? user.id! : user, toCreate, transaction, merge);
            if (saved.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(saved));
            }

            toReturn.push(...saved.value);
        }

        toReturn.forEach((result, i) => {
            if (result?.id) {
                Object.assign(nodes[i], result);
            }
        });

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        nodes = nodes.filter((n) => n.id);

        return Promise.resolve(Result.Success(true));
    }

    addFile(node: Node, fileID: string): Promise<Result<boolean>> {
        if (!node.id) {
            return Promise.resolve(Result.Failure('node must have id'));
        }

        return this.#mapper.AddFile(node.id, fileID);
    }

    bulkAddFiles(node: Node, fileIDs: string[], transaction?: PoolClient): Promise<Result<NodeFile[]>> {
        if (!node.id) {
            return Promise.resolve(Result.Failure('node must have id'));
        }

        const nodeFiles: NodeFile[] = [];

        fileIDs.forEach((id) => nodeFiles.push(new NodeFile({node_id: node.id!, file_id: id})));

        return this.#mapper.BulkAddFile(nodeFiles, transaction);
    }

    removeFile(node: Node, fileID: string): Promise<Result<boolean>> {
        if (!node.id) {
            return Promise.resolve(Result.Failure('node must have id'));
        }

        return this.#mapper.RemoveFile(node.id, fileID);
    }

    listFiles(node: Node): Promise<Result<File[]>> {
        if (!node.id) {
            return Promise.resolve(Result.Failure('node must have id'));
        }

        return this.#fileMapper.ListForNode(node.id);
    }

    // listTimeseriesTables returns a list of all the GraphQL friendly names of the data sources that exist
    async listTimeseriesTables(node: Node, containerID: string): Promise<Result<Map<string, string>>> {
        const out = new Map<string, string>();

        const dataSources = await new DataSourceRepository().where().containerID('eq', containerID).and().adapter_type('eq', 'timeseries').list();
        if (dataSources.isError) {
            return Promise.resolve(Result.Failure(`unable to list datasources for timeseries for node ${dataSources.error?.error}`));
        }

        // there might be a better, and closer to the sql way of doing this - but for now there won't be so many data sources
        // that pulling and looping through them is going to cause issues
        const matchedDataSources = dataSources.value.filter((source) => {
            if (!source) return false;
            let truthCount = 0;

            const config = source.DataSourceRecord!.config as TimeseriesDataSourceConfig;
            if (config.attachment_parameters.length === 0) return false;
            for (const parameter of config.attachment_parameters) {
                // if we don't match this filter then we can assume we fail the rest as it's only AND conjunction at
                // this time
                switch (parameter.type) {
                    case 'data_source': {
                        try {
                            if (valueCompare(parameter.operator!, node.data_source_id, parameter.value)) truthCount += 1;
                            break;
                        } catch (e) {
                            Logger.error(`error comparing values for data source attachment parameters`);
                            return false;
                        }
                    }
                    case 'metatype_id': {
                        try {
                            if (valueCompare(parameter.operator!, node.metatype_id, parameter.value)) truthCount += 1;
                            break;
                        } catch (e) {
                            Logger.error(`error comparing values for metatype id attachment parameters`);
                            return false;
                        }
                    }

                    case 'metatype_name': {
                        try {
                            if (valueCompare(parameter.operator!, node.metatype_name, parameter.value)) truthCount += 1;
                            break;
                        } catch (e) {
                            Logger.error(`error comparing values for metatype name attachment parameters`);
                            return false;
                        }
                    }

                    case 'original_id': {
                        try {
                            if (valueCompare(parameter.operator!, node.original_data_id, parameter.value)) truthCount += 1;
                            break;
                        } catch (e) {
                            Logger.error(`error comparing values for original id attachment parameters`);
                            return false;
                        }
                    }

                    case 'property': {
                        try {
                            type ObjectKey = keyof typeof node.properties;
                            if (valueCompare(parameter.operator!, node.properties[parameter.key as ObjectKey], parameter.value)) truthCount += 1;
                            break;
                        } catch (e) {
                            Logger.error(`error comparing values for property attachment parameters`);
                            return false;
                        }
                    }

                    case 'id': {
                        try {
                            if (valueCompare(parameter.operator!, node.id, parameter.value)) truthCount += 1;
                            break;
                        } catch (e) {
                            Logger.error(`error comparing values for id attachment parameters`);
                            return false;
                        }
                    }
                }
            }

            return truthCount === config.attachment_parameters.length;
        });

        // we need to follow the same naming scheme as the graphQL layer
        matchedDataSources.map((d, index) => {
            if (out.get(stringToValidPropertyName(d?.DataSourceRecord?.name!))) {
                out.set(`${stringToValidPropertyName(d?.DataSourceRecord?.name!)}_${index}`, d?.DataSourceRecord?.id!);
            } else {
                out.set(stringToValidPropertyName(d?.DataSourceRecord?.name!), d?.DataSourceRecord?.id!);
            }
        });

        return Promise.resolve(Result.Success(out));
    }

    id(operator: string, value?: any) {
        super.query('id', operator, value);
        return this;
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
        return this;
    }

    metatypeID(operator: string, value: any) {
        super.query('metatype_id', operator, value);
        return this;
    }

    metatypeName(operator: string, value: any) {
        super.query('name', operator, value, this.useView ? undefined : {tableName: 'metatypes'});
        return this;
    }

    originalDataID(operator: string, value: any) {
        super.query('original_data_id', operator, value);
        return this;
    }

    dataSourceID(operator: string, value: any) {
        super.query('data_source_id', operator, value);
        return this;
    }

    transformationID(operator: string, value: any) {
        super.query('type_mapping_transformation_id', operator, value);
        return this;
    }

    importDataID(operator: string, value: any) {
        super.query('import_data_id', operator, value);
        return this;
    }

    createdAt(operator: string, value: any) {
        super.query('modified_at', operator, value);
        return this;
    }

    modifiedAt(operator: string, value: any) {
        super.query('created_at', operator, value);
        return this;
    }

    property(key: string, operator: string, value: any, dataType?: string) {
        super.queryJsonb(key, 'properties', operator, value, {dataType});
        return this;
    }

    metatypeUUID(operator: string, value: any) {
        super.query('uuid', operator, value, this.useView ? undefined : {tableName: 'metatypes'});
        return this;
    }

    async count(transaction?: PoolClient, queryOptions?: QueryOptions): Promise<Result<number>> {
        const results = await super.count(transaction, queryOptions);

        if (results.isError) return Promise.resolve(Result.Pass(results));
        return Promise.resolve(Result.Success(results.value));
    }

    async list(loadMetatypes?: boolean, queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<Node[]>> {
        const results = await super.findAll<Node>(queryOptions, {
            transaction,
            resultClass: Node,
        });

        if (results.isError) return Promise.resolve(Result.Pass(results));

        if (loadMetatypes) {
            await Promise.all(
                results.value.map((node) => {
                    return new Promise((resolve) => {
                        void this.#metatypeRepo.findByID(node.metatype_id).then((metatype) => {
                            if (metatype.isError) {
                                resolve(Result.Failure(`unable to load node's metatypes ${metatype.error?.error}`));
                                return;
                            }

                            node.metatype = metatype.value;
                            resolve(Result.Success(true));
                        });
                    });
                }),
            );
        }

        this.reset();
        return Promise.resolve(Result.Success(results.value));
    }

    raw_sql(queryOptions?: QueryOptions): string {
        const results = super.raw_sql(queryOptions);

        this.reset();
        return results;
    }

    // note that listStreaming and listAllToFile will not automatically fill in the metatype information apart from the
    // join already happening on the table. Users calling this function are responsible for filling the metatype object
    // if they require it
    listStreaming(queryOptions?: QueryOptions, transaction?: PoolClient): Promise<QueryStream> {
        return super.findAllStreaming(queryOptions, {
            transaction,
            resultClass: Node,
        });
    }

    async listAllToFile(fileOptions: FileOptions, queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<File>> {
        if (fileOptions.file_type === 'parquet' && !fileOptions.parquet_schema) {
            fileOptions.parquet_schema = {
                id: {type: 'INT64'},
                container_id: {type: 'INT64'},
                metatype_id: {type: 'INT64'},
                metatype_uuid: {type: 'UTF8'},
                metatype_name: {type: 'UTF8'},
                properties: {type: 'JSON'},
                original_data_id: {type: 'UTF8', optional: true},
                import_data_id: {type: 'INT64', optional: true},
                data_staging_id: {type: 'INT64', optional: true},
                data_source_id: {type: 'INT64', optional: true},
                type_mapping_transformation_id: {type: 'INT64', optional: true},
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
        super.reset(this.useView ? NodeMapper.viewName : NodeMapper.tableName);
        if (!this.useView) {
            this.distinctOn('id')
                .addFields({name: 'metatype_name', uuid: 'metatype_uuid'}, 'm')
                .join('metatypes', {origin_col: 'metatype_id', destination_col: 'id'}, {destination_alias: 'm'})
                .where()
                .query('deleted_at', 'is null')
                .sortBy('id')
                .sortBy('created_at', undefined, true);

            // combine all select-fields into one string in case of COUNT(*) replacement
            this._query.SELECT = [this._query.SELECT.join(', ')];
        }
    }
}
