import DataSourceRecord, {DataSource, ReceiveDataOptions} from '../../../domain_objects/data_warehouse/import/data_source';
import ImportRepository from '../../../data_access_layer/repositories/data_warehouse/import/import_repository';
import DataStagingRepository from '../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import ImportMapper from '../../../data_access_layer/mappers/data_warehouse/import/import_mapper';
import Logger from '../../../services/logger';
import Config from '../../../services/config';
import Import, {DataStaging} from '../../../domain_objects/data_warehouse/import/import';
import {PoolClient} from 'pg';
import Result from '../../../common_classes/result';
import TypeMappingRepository from '../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import NodeRepository from '../../../data_access_layer/repositories/data_warehouse/data/node_repository';
import EdgeRepository from '../../../data_access_layer/repositories/data_warehouse/data/edge_repository';
import Node, {IsNodes} from '../../../domain_objects/data_warehouse/data/node';
import Edge, {IsEdges} from '../../../domain_objects/data_warehouse/data/edge';
import ContainerRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/container_respository';
import {User} from '../../../domain_objects/access_management/user';
import {PassThrough, Readable} from 'stream';
import TypeMapping from '../../../domain_objects/data_warehouse/etl/type_mapping';
import DataStagingMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
import FileMapper from '../../../data_access_layer/mappers/data_warehouse/data/file_mapper';
import {EdgeFile, NodeFile} from '../../../domain_objects/data_warehouse/data/file';
import NodeMapper from '../../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import EdgeMapper from '../../../data_access_layer/mappers/data_warehouse/data/edge_mapper';
const JSONStream = require('JSONStream');

/*
    StandardDataSourceImpl is the most basic of data sources, and serves as the base
    for the Http data source. Users will generally interact with the DataSource interface
    over the implementation directly.
 */
export default class StandardDataSourceImpl implements DataSource {
    DataSourceRecord?: DataSourceRecord;
    // we're dealing with mappers directly because we don't need any validation
    // or the additional processing overhead the repository could cause
    #mapper = DataSourceMapper.Instance;
    #containerRepo = new ContainerRepository();
    #importRepo = new ImportRepository();
    #stagingRepo = new DataStagingRepository();

    constructor(record: DataSourceRecord) {
        // again we have to check for param existence because we might potentially be using class-transformer
        if (record) {
            this.DataSourceRecord = record;
        }
    }

    // see the interface declaration's explanation of ReceiveData
    async ReceiveData(payloadStream: Readable, user: User, options?: ReceiveDataOptions): Promise<Result<Import | DataStaging[]>> {
        if (!this.DataSourceRecord || !this.DataSourceRecord.id) {
            return Promise.resolve(Result.Failure('cannot receive data, no underlying or saved data source record'));
        }

        let internalTransaction = false;
        let transaction: PoolClient;

        if (options && options.transaction) {
            transaction = options.transaction;
        } else {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiated db transaction'));

            transaction = newTransaction.value;
            internalTransaction = true;
        }

        if (!this.DataSourceRecord || !this.DataSourceRecord.id) {
            if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
            return Promise.resolve(
                Result.Failure(
                    `unable to receive data, data source either doesn't have a record present or data source needs to be saved prior to data being received`,
                ),
            );
        }

        let importID: string;

        if (options && options.importID) {
            importID = options.importID;
        } else {
            const newImport = await ImportMapper.Instance.CreateImport(
                user.id!,
                new Import({
                    data_source_id: this.DataSourceRecord.id,
                    reference: 'manual upload',
                }),
                transaction,
            );

            if (newImport.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Failure(`unable to create import for data ${newImport.error?.error}`));
            }

            importID = newImport.value.id!;
        }

        // we used to lock this for receiving data, but it makes no sense as this is an additive process which does not
        // modify the import in any way. Locking prevented the mapper from running correctly.
        const retrievedImport = await this.#importRepo.findByID(importID, transaction);
        if (retrievedImport.isError) {
            if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
            Logger.error(`unable to retrieve and lock import ${retrievedImport.error}`);
            return Promise.resolve(Result.Failure(`unable to retrieve and lock import ${retrievedImport.error?.error}`));
        }

        // basically a buffer, once it's full we'll write these records to the database and wipe to start again
        let recordBuffer: DataStaging[] = [];

        // let's us wait for all save operations to complete - we can still fail fast on a bad import since all the
        // save operations will share the same database transaction under the hood
        const saveOperations: Promise<Result<boolean>>[] = [];

        // our PassThrough stream is what actually processes the data, it's the last step in our eventual pipe
        const pass = new PassThrough({objectMode: true});

        pass.on('data', (data) => {
            recordBuffer.push(
                new DataStaging({
                    data_source_id: this.DataSourceRecord!.id!,
                    import_id: retrievedImport.value.id!,
                    data,
                    shape_hash: options && options.generateShapeHash ? TypeMapping.objectToShapeHash(data) : undefined,
                }),
            );

            // if we've reached the process record limit, insert into the database and wipe the records array
            // make sure to COPY the array into bulkSave function so that we can push it into the array of promises
            // and not modify the underlying array on save, allowing us to move asynchronously,
            if (recordBuffer.length >= Config.data_source_receive_buffer) {
                // if we are returning
                // the staging records, don't wipe the buffer just keep adding
                if (!options || !options.returnStagingRecords) {
                    const toSave = [...recordBuffer];
                    recordBuffer = [];

                    saveOperations.push(this.#stagingRepo.bulkSave(toSave, transaction));
                }
            }
        });

        // catch any records remaining in the buffer
        pass.on('end', () => {
            saveOperations.push(this.#stagingRepo.bulkSave(recordBuffer, transaction));
        });

        // the JSONStream pipe is simple, parsing a single array of json objects into parts
        const fromJSON = JSONStream.parse('*');

        // handle all transform streams, piping each in order
        if (options && options.transformStreams && options.transformStreams.length > 0) {
            let pipeline = payloadStream;

            for (const pipe of options.transformStreams) {
                pipeline = pipeline.pipe(pipe);
            }

            // for the pipe process to work correctly you must wait for the pipe to finish reading all data
            await new Promise((fulfill) => pipeline.pipe(fromJSON).pipe(pass).on('finish', fulfill));
        } else if (options && options.overrideJsonStream) {
            await new Promise((fulfill) => payloadStream.pipe(pass).on('finish', fulfill));
        } else {
            await new Promise((fulfill) => payloadStream.pipe(fromJSON).pipe(pass).on('finish', fulfill));
        }

        // we have to wait until any save operations are complete before we can act on the pipe's results
        const saveResults = await Promise.all(saveOperations);

        // if any of the save operations have an error, fail and rollback the transaction etc
        if (saveResults.filter((result) => result.isError || !result.value).length > 0) {
            if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
            return Promise.resolve(
                Result.Failure(
                    `one or more attempts to save data to the database failed, encountered the following errors: ${saveResults
                        .filter((r) => r.isError)
                        .map((r) => r.error)}`,
                ),
            );
        }

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        // return the saved buffer as we haven't wiped it, should contain all records with their updated IDs
        if (options && options.returnStagingRecords) {
            return new Promise((resolve) => resolve(Result.Success(recordBuffer)));
        }

        return new Promise((resolve) => resolve(Result.Success(retrievedImport.value)));
    }

    /*
        Process verifies that a data source is active and then starts a never-ending
        loop which takes received data and converts it to nodes and edges, prior
        to inserting it into the database.
     */
    async Process(): Promise<Result<boolean>> {
        if (this.DataSourceRecord) {
            // we run this check constantly to catch data sources disabled by the user since this class was created
            const active = await DataSourceMapper.Instance.IsActive(this.DataSourceRecord.id!);
            if (active.isError || !active.value) return Promise.resolve(Result.Success(true));

            const container = await this.#containerRepo.findByID(this.DataSourceRecord.container_id!);
            if (container.isError) {
                return Promise.resolve(Result.Failure(`unable to fetch container for data source record ${container.error?.error}`));
            }

            // we limit the imports we process to ten, as this is now a job vs. never-ending loop we don't want to overwhelm
            // the worker in case of a data source being slammed with imports (e.g the Aveva adapters initial import)
            const incompleteImports = await this.#importRepo.listIncompleteWithUninsertedData(this.DataSourceRecord.id!, 10);
            if (!incompleteImports.isError) {
                for (const incompleteImport of incompleteImports.value) {
                    // we must wrap this insert as a transaction so that we are able to
                    // lock the individual row for processing.
                    // we won't pass the transaction into every function, only the updates
                    const importTransaction = await ImportMapper.Instance.startTransaction();
                    if (importTransaction.isError) {
                        Logger.debug(`error attempting to start db transaction for import ${importTransaction.error}`);
                        continue;
                    }

                    // attempt to retrieve and lock the record for processing
                    const dataImport = await this.#importRepo.findByIDAndLock(incompleteImport.id!, importTransaction.value);
                    if (dataImport.isError) {
                        await ImportMapper.Instance.completeTransaction(importTransaction.value);

                        Logger.debug(`error obtaining lock on import record ${dataImport.error}`);
                        continue;
                    }

                    const processed = await this.process(incompleteImport, importTransaction.value);
                    if (processed.isError) {
                        const set = await this.#importRepo.setStatus(
                            incompleteImport.id!,
                            'error',
                            `error attempting to process import ${processed.error?.error}`,
                            importTransaction.value,
                        );
                        if (set.isError) Logger.debug(`error attempting to update import status ${set.error}`);

                        await ImportMapper.Instance.completeTransaction(importTransaction.value);
                        continue;
                    }

                    // check to see if import is now complete. If so, mark completed.
                    const count = await this.#stagingRepo.countUninsertedForImport(incompleteImport.id!, importTransaction.value);
                    if (count.isError) {
                        const set = await ImportMapper.Instance.SetStatus(
                            incompleteImport.id!,
                            'error',
                            `error attempting to count records ${count.error}`,
                            importTransaction.value,
                        );
                        if (set.isError) Logger.debug(`error attempting to update import status ${set.error}`);

                        await ImportMapper.Instance.completeTransaction(importTransaction.value);
                        continue;
                    }

                    if (count.value === 0) {
                        const set = await this.#importRepo.setStatus(
                            incompleteImport.id!,
                            'completed',
                            'import has been successfully processed',
                            importTransaction.value,
                        );
                        if (set.isError) Logger.debug(`error attempting to update import status ${set.error}`);

                        await ImportMapper.Instance.completeTransaction(importTransaction.value);
                        continue;
                    }

                    const set = await this.#importRepo.setStatus(
                        incompleteImport.id!,
                        'processing',
                        'import is still open for processing',
                        importTransaction.value,
                    );
                    if (set.isError) Logger.debug(`error attempting to update import status ${set.error}`);
                    await ImportMapper.Instance.completeTransaction(importTransaction.value);
                }
            }
        }

        return Promise.resolve(Result.Success(true));
    }

    private async process(dataImport: Import, transactionClient: PoolClient): Promise<Result<boolean>> {
        const stagingRepo = new DataStagingRepository();
        const mappingRepo = new TypeMappingRepository();
        const nodeRepository = new NodeRepository();
        const edgeRepository = new EdgeRepository();

        // attempt to process only those records which have active type mappings
        // with transformations
        const totalToProcess = await stagingRepo.countUninsertedActiveMappingForImport(dataImport.id!, transactionClient);
        if (totalToProcess.isError) {
            return new Promise((resolve) => resolve(Result.Pass(totalToProcess)));
        }

        if (totalToProcess.value === 0) {
            return new Promise((resolve) =>
                resolve(Result.SilentFailure(`import data for ${dataImport.id} does not have active type mappings with transformations for un-inserted data`)),
            );
        }

        // so as to not swamp memory we process in batches, batch size determined by config.
        // we know this could give false negative on edge imports, but we trust the user is
        // informed well enough via error messages to catch on that the error is either temporary
        // or that it will be corrected when a node record is completed. Even though we insert the
        // nodes/edges per data record one a time, we still need to batch the listing process for
        // the data as we have no idea how large an import could be.
        for (let i = 0; i < Math.floor(totalToProcess.value / Config.data_source_batch_size) + 1; i++) {
            const toProcess = await stagingRepo.listUninsertedActiveMapping(
                dataImport.id!,
                i * Config.data_source_batch_size,
                Config.data_source_batch_size,
                transactionClient,
            );
            if (toProcess.isError) {
                return new Promise((resolve) => resolve(Result.SilentFailure(`error attempting to fetch from data_staging ${toProcess.error?.error}`)));
            }

            if (toProcess.value.length === 0) break;

            // we must fetch the file records for these data staging records, so that once they're processed we can attach
            // the files to the resulting nodes/edges - this is not a failure state if we can't fetch them - log and move on
            const stagingFiles = await FileMapper.Instance.ListForDataStagingRaw(...toProcess.value.map((staging) => staging.id!));
            if (stagingFiles.isError) {
                Logger.error(`unable to fetch files for data staging records ${stagingFiles.error?.error}`);
            }

            // we run all the transformations for an individual row, then insert into the database. We've chosen to
            // do this instead of batching so that we can pinpoint errors to an individual data row. Hopefully the caching
            // layer implementation on the fetching of metatype/keys/relationships is robust enough to insure this doesn't
            // become a performance issue.
            for (const row of toProcess.value) {
                // pull the mapping and transformations for the individual data row. Then transform the data prior to
                // insert
                const mapping = await mappingRepo.findByShapeHash(row.shape_hash!, row.data_source_id!, true);
                if (mapping.isError) {
                    return new Promise((resolve) => resolve(Result.SilentFailure(`error attempting to fetch type mapping ${mapping.error?.error}`)));
                }

                const nodesToInsert: Node[] = [];
                const edgesToInsert: Edge[] = [];

                // for each transformation run the transformation process. Results will either be an array of nodes or an array of edges
                // if we run into errors, add the error to the data staging row, and immediately return. Do not attempt to
                // run any more transformations
                if (mapping.value.transformations)
                    for (const transformation of mapping.value.transformations) {
                        // skip if the transformation is archived
                        if (transformation.archived) continue;

                        // keep in mind that any conversion errors that didn't cause the complete failure of the transformation
                        // will be contained in the metadata object on the transformed object
                        const results = await transformation.applyTransformation(row);
                        if (results.isError) {
                            await stagingRepo.addError(row.id!, `unable to apply transformation ${transformation.id} to data ${row.id}: ${results.error}`);
                            return new Promise((resolve) =>
                                resolve(Result.SilentFailure(`unable to apply transformation ${transformation.id} to data ${row.id}: ${results.error}`)),
                            );
                        }

                        // check to see result type, force into corresponding container
                        if (IsNodes(results.value)) nodesToInsert.push(...results.value);
                        if (IsEdges(results.value)) edgesToInsert.push(...results.value);
                    }

                // insert all nodes first, then edges
                if (nodesToInsert.length > 0) {
                    nodesToInsert.forEach((node) => {
                        node.container_id = this.DataSourceRecord!.container_id!;
                        node.data_source_id = this.DataSourceRecord!.id!;
                    });

                    const inserted = await nodeRepository.bulkSave(this.DataSourceRecord!.modified_by!, nodesToInsert, transactionClient);
                    if (inserted.isError) {
                        return new Promise((resolve) => resolve(Result.SilentFailure(`error attempting to insert nodes ${inserted.error?.error}`)));
                    }

                    // now that the nodes are inserted, attempt to attach any files from their original staging records
                    // to them
                    if (!stagingFiles.isError && stagingFiles.value.length > 0) {
                        const nodeFiles: NodeFile[] = [];

                        nodesToInsert.forEach((node) => {
                            const toAttach = stagingFiles.value.filter((stagingFile) => stagingFile.data_staging_id === node.data_staging_id);
                            if (toAttach) {
                                toAttach.forEach((stagingFile) => {
                                    nodeFiles.push(
                                        new NodeFile({
                                            node_id: node.id!,
                                            file_id: stagingFile.file_id!,
                                        }),
                                    );
                                });
                            }
                        });

                        const attached = await NodeMapper.Instance.BulkAddFile(nodeFiles, transactionClient);
                        if (attached.isError) {
                            Logger.error(`unable to attach files to nodes during data staging process ${attached.error?.error}`);
                        }
                    }
                }

                if (edgesToInsert.length > 0) {
                    edgesToInsert.forEach((edge) => {
                        edge.container_id = this.DataSourceRecord!.container_id!;
                        edge.data_source_id = this.DataSourceRecord!.id!;
                    });

                    const inserted = await edgeRepository.bulkSave(this.DataSourceRecord!.modified_by!, edgesToInsert, transactionClient);
                    if (inserted.isError) {
                        return new Promise((resolve) => resolve(Result.SilentFailure(`error attempting to insert nodes ${inserted.error?.error}`)));
                    }

                    // now that the edges are inserted, attempt to attach any files from their original staging records
                    // to them
                    if (!stagingFiles.isError && stagingFiles.value.length > 0) {
                        const edgeFiles: EdgeFile[] = [];

                        edgesToInsert.forEach((edge) => {
                            const toAttach = stagingFiles.value.filter((stagingFile) => stagingFile.data_staging_id === edge.data_staging_id);
                            if (toAttach) {
                                toAttach.forEach((stagingFile) => {
                                    edgeFiles.push(
                                        new EdgeFile({
                                            edge_id: edge.id!,
                                            file_id: stagingFile.file_id!,
                                        }),
                                    );
                                });
                            }
                        });

                        const attached = await EdgeMapper.Instance.BulkAddFile(edgeFiles, transactionClient);
                        if (attached.isError) {
                            Logger.error(`unable to attach files to edges during data staging process ${attached.error?.error}`);
                        }
                    }
                }

                const marked = await stagingRepo.setInserted(row, transactionClient);
                if (marked.isError) {
                    // update the individual data row which failed
                    await stagingRepo.addError(row.id!, `error attempting to mark data inserted ${marked.error}`);

                    return new Promise((resolve) => resolve(Result.SilentFailure(`error attempting to mark data inserted ${marked.error}`)));
                }
            }
        }

        return new Promise((resolve) => resolve(Result.Success(true)));
    }

    ToSave(): Promise<DataSourceRecord> {
        // no additional processing is needed on the record prior to storage
        return Promise.resolve(this.DataSourceRecord!);
    }

    delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
