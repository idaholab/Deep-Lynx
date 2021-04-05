import DataSourceRecord, {DataSource} from "./data_source";
import ImportRepository from "../../data_access_layer/repositories/data_warehouse/import/import_repository";
import DataStagingRepository from "../../data_access_layer/repositories/data_warehouse/import/data_staging_repository";
import DataSourceMapper from "../../data_access_layer/mappers/data_warehouse/import/data_source_mapper";
import ImportMapper from "../../data_access_layer/mappers/data_warehouse/import/import_mapper";
import Logger from "../../services/logger";
import Config from "../../services/config";
import Import, {DataStaging} from "./import";
import {PoolClient} from "pg";
import Result from "../../common_classes/result";
import TypeMappingRepository from "../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository";
import NodeRepository from "../../data_access_layer/repositories/data_warehouse/data/node_repository";
import EdgeRepository from "../../data_access_layer/repositories/data_warehouse/data/edge_repository";
import Node, {IsNodes} from "../data/node";
import Edge, {IsEdges} from "../data/edge";
import GraphMapper from "../../data_access_layer/mappers/data_warehouse/data/graph_mapper";
import ContainerRepository from "../../data_access_layer/repositories/data_warehouse/ontology/container_respository";
import { User } from "../../access_management/user";
import TypeMapping from "../etl/type_mapping";
import TypeMappingMapper from "../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper";

/*
    StandardDataSourceImpl is the most basic of data sources, and serves as the base
    for the Http data source. Users will generally interact with the DataSource interface
    over the implementation directly.
 */
export default class StandardDataSourceImpl implements DataSource {
    DataSourceRecord?: DataSourceRecord
    // we're dealing with mappers directly because we don't need any validation
    // or the additional processing overhead the repository could cause
    #mapper = DataSourceMapper.Instance
    #graphMapper = GraphMapper.Instance
    #containerRepo = new ContainerRepository()
    #importRepo = new ImportRepository()
    #stagingRepo = new DataStagingRepository()
    #mappingMapper = new TypeMappingMapper()

    constructor(record: DataSourceRecord) {
        // again we have to check for param existence because we might potentially be using class-transformer
        if(record) {
            this.DataSourceRecord = record
        }
    }

    // TODO: this will need to be reworked to handle larger payloads at some point, and to take advantage of Postgres's file copy
    async ReceiveData(payload: any, user: User, transaction?: PoolClient): Promise<Result<Import>> {
        let internalTransaction: boolean = false
        if(!transaction) {
            const newTransaction = await this.#mapper.startTransaction()
            if(newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiated db transaction'))

            transaction = newTransaction.value
            internalTransaction = true
        }

        if(!this.DataSourceRecord || !this.DataSourceRecord.id) {
            if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
            return Promise.resolve(Result.Failure(`unable to receive data, data source either doesn't have a record present or data source needs to be saved prior to data being received`))
        }

        if(!Array.isArray(payload)) {
            if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
            return new Promise(resolve => resolve(Result.Failure("payload must be an array of JSON objects")))
        }

        const newImport = await ImportMapper.Instance.CreateImport(user.id!, new Import({
            data_source_id: this.DataSourceRecord.id!,
            reference: "manual upload"
        }))

        if(newImport.isError) {
            if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
            return Promise.resolve(Result.Failure(`unable to create import for data ${newImport.error?.error}`))
        }

        const lockNewImport = await this.#importRepo.findByIDAndLock(newImport.value.id!, transaction)
        if(lockNewImport.isError) {
            if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
            Logger.error(`unable to retrieve and lock new import ${lockNewImport.error}`)
            return Promise.resolve(Result.Failure(`unable to retrieve and lock new import ${lockNewImport.error?.error}`))
        }

        const recordPromises : Promise<DataStaging>[] = []

        for(const data of payload) {
            recordPromises.push(new Promise((resolve, reject) => {
                // we call the mapping repo directly here because we don't need
                // the pre-processing steps - and we're calling CreateOrUpdate in order
                // to avoid having to try fetching or finding an existing mapping
                this.#mappingMapper.CreateOrUpdate(user.id!, new TypeMapping({
                    container_id: this.DataSourceRecord!.container_id!,
                    data_source_id: this.DataSourceRecord!.id!,
                    sample_payload: data,
                    shape_hash: TypeMapping.objectToShapeHash(data)
                }), transaction)
                    .then(mapping => {
                        if(mapping.isError) {
                            reject(`unable to create or update type mapping ${mapping.error?.error}`)
                        }

                        resolve(new DataStaging({
                            data_source_id: this.DataSourceRecord!.id!,
                            import_id: newImport.value.id!,
                            mapping_id: mapping.value.id!,
                            data
                        }))
                    })
                    .catch(e => reject(`unable to create or update type mapping ${e}`))
            }))
        }

        try {
            const records = await Promise.all(recordPromises)
            const saved = await this.#stagingRepo.bulkSave(records, transaction)
            if(saved.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(saved))
            }

            if(internalTransaction) {
                const commit = await this.#mapper.completeTransaction(transaction)
                if(commit.isError) return Promise.resolve(Result.Pass(commit))
            }

            return new Promise(resolve => resolve(Result.Success(newImport.value)))
        } catch(error) {
            if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
            return Promise.resolve(Result.Failure(`error attempting to insert new data records for import ${error}`))
        }
    }

    /*
        Process verifies that a data source is active and then starts a never-ending
        loop which takes recieved data and converts it to nodes and edges, prior
        to inserting it into the database.
     */
    async Process(loopOnce?: boolean): Promise<void> {
        if(this.DataSourceRecord) while(true) {
            let graphID: string

            // we run this check constantly to catch data sources disabled by the user since this class was created
            const active = await DataSourceMapper.Instance.IsActive(this.DataSourceRecord.id!)
            if(active.isError || !active.value) break;

            const container = await this.#containerRepo.findByID(this.DataSourceRecord.container_id!)
            if(container.isError) {
                Logger.debug(`unable to fetch container for data source record ${container.error?.error}`)
                return
            }

            // verify that the active graph for the container is set, if not, set it.
            if(container.value.active_graph_id){
                graphID = container.value.active_graph_id
            } else {
                const graph = await this.#graphMapper.Create(container.value.id!, this.DataSourceRecord.created_by!)
                if(graph.isError) {
                    Logger.error(graph.error?.error!);
                    return;
                } else {
                    const activeGraph = await this.#graphMapper.SetActiveForContainer(container.value.id!, graph.value.id!);

                    if (activeGraph.isError || !activeGraph.value) {
                        Logger.error(activeGraph.error?.error!);
                        return
                    } else {graphID = graph.value.id!}
                }
            }

            const incompleteImports = await this.#importRepo.listIncompleteWithUninsertedData(this.DataSourceRecord.id!)
            if(!incompleteImports.isError) {
                for(const incompleteImport of incompleteImports.value) {
                    // we must wrap this insert as a transaction so that we are able to
                    // lock the individual row for processing.
                    // we won't pass the transaction into every function, only the updates
                    const importTransaction = await ImportMapper.Instance.startTransaction()
                    if(importTransaction.isError) {
                        Logger.debug(`error attempting to start db transaction for import ${importTransaction.error}`)
                        continue
                    }

                    // attempt to retrieve and lock the record for processing
                    const dataImport = await this.#importRepo.findByIDAndLock(incompleteImport.id!, importTransaction.value)
                    if(dataImport.isError) {
                        await ImportMapper.Instance.completeTransaction(importTransaction.value)

                        Logger.debug(`error obtaining lock on import record ${dataImport.error}`)
                        continue
                    }

                    const processed = await this.process(incompleteImport, graphID, importTransaction.value)
                    if(processed.isError) {
                        Logger.debug(`import ${incompleteImport.id} incomplete: ${processed.error?.error!}`)

                        const set = await this.#importRepo.setStatus(incompleteImport.id!, "error", `error attempting to process import ${processed.error?.error}`, importTransaction.value)
                        if(set.isError) Logger.debug(`error attempting to update import status ${set.error}`)

                        await ImportMapper.Instance.completeTransaction(importTransaction.value)
                        continue
                    }

                    // check to see if import is now complete. If so, mark completed.
                    const count = await this.#stagingRepo.countUninsertedForImport(incompleteImport.id!)
                    if(count.isError) {
                        const set = await ImportMapper.Instance.SetStatus(incompleteImport.id!, "error", `error attempting to count records ${count.error}`, importTransaction.value)
                        if(set.isError) Logger.debug(`error attempting to update import status ${set.error}`)

                        await ImportMapper.Instance.completeTransaction(importTransaction.value)
                        continue
                    }

                    if(count.value === 0) {
                        const set = await this.#importRepo.setStatus(incompleteImport.id!, "completed", undefined, importTransaction.value)
                        if(set.isError) Logger.debug(`error attempting to update import status ${set.error}`)

                        await ImportMapper.Instance.completeTransaction(importTransaction.value)
                        continue
                    }

                    const set = await  this.#importRepo.setStatus(incompleteImport.id!, "processing", undefined, importTransaction.value)
                    if(set.isError) Logger.debug(`error attempting to update import status ${set.error}`)
                    await ImportMapper.Instance.completeTransaction(importTransaction.value)
                }
            }

            // we use the loopOnce param to allow us to easily test this processing loop
            if(loopOnce) break;

            await this.delay(Config.data_source_poll_interval)
        }
    }

    private async process(dataImport: Import, graphID: string, transactionClient: PoolClient): Promise<Result<boolean>> {
        const stagingRepo = new DataStagingRepository()
        const mappingRepo = new TypeMappingRepository()
        const nodeRepository = new NodeRepository()
        const edgeRepository = new EdgeRepository()

        // attempt to process only those records which have active type mappings
        // with transformations
        const totalToProcess = await stagingRepo.countUninsertedActiveMappingForImport(dataImport.id!, transactionClient)
        if(totalToProcess.isError) {
            return new Promise(resolve => resolve(Result.Pass(totalToProcess)))
        }

        if(totalToProcess.value === 0) {
            return new Promise(resolve => resolve(Result.SilentFailure(`import data for ${dataImport.id} does not have active type mappings with transformations for uninserted data`)))
        }

        // so as to not swamp memory we process in batches, batch size determined by config.
        // we know this could give false negative on edge imports, but we trust the user is
        // informed well enough via error messages to catch on that the error is either temporary
        // or that it will be corrected when a node record is completed. Even though we insert the
        // nodes/edges per data record one a time, we still need to batch the listing process for
        // the data as we have no idea how large an import could be.
        for(let i = 0; i < Math.floor(totalToProcess.value / Config.data_source_batch_size) + 1 ; i++) {
            const toProcess = await stagingRepo.listUninsertedActiveMapping(dataImport.id!, i * Config.data_source_batch_size, Config.data_source_batch_size, transactionClient)
            if(toProcess.isError) {
                return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to fetch from data_staging ${toProcess.error?.error}`)))
            }

            if(toProcess.value.length === 0) break;

            // we run all the transformations for an individual row, then insert into the database. We've choosen to
            // do this instead of batching so that we can pinpoint errors to an invididual data row. Hopefully the caching
            // layer implementation on the fetching of metatype/keys/relationships is robust enough to insure this doesn't
            // become a performance issue.
            for(const row of toProcess.value) {
                // pull the mapping and transformations for the individual data row. Then transform the data prior to
                // insert
                const mapping = await mappingRepo.findByID(row.mapping_id!, true)
                if(mapping.isError) {
                    return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to fetch type mapping ${mapping.error?.error}`)))
                }

                const nodesToInsert: Node[] = []
                const edgesToInsert: Edge[] = []

                // for each transformation run the transformation process. Results will either be an array of nodes or an array of edges
                // if we run into errors, add the error to the data staging row, and immediately return. Do not attempt to
                // run any more transformations
                if(mapping.value.transformations) for(const transformation of mapping.value.transformations) {
                    const results = await transformation.applyTransformation(row)
                    if(results.isError) {
                        await stagingRepo.addError(row.id!, `unable to apply transformation ${transformation.id} to data ${row.id}: ${results.error}`)
                        return new Promise(resolve => resolve(Result.SilentFailure(`unable to apply transformation ${transformation.id} to data ${row.id}: ${results.error}`)))
                    }

                    // check to see result type, force into corresponding container
                    if(IsNodes(results.value)) nodesToInsert.push(...results.value)
                    if(IsEdges(results.value)) edgesToInsert.push(...results.value)
                }

                // insert all nodes first, then edges
                if(nodesToInsert.length > 0) {
                    nodesToInsert.forEach(node => {
                        node.container_id = this.DataSourceRecord!.container_id!
                        node.graph_id = graphID,
                            node.data_source_id = this.DataSourceRecord!.id!
                    })

                    const inserted = await nodeRepository.bulkSave(this.DataSourceRecord!.modified_by!, nodesToInsert, transactionClient)
                    if(inserted.isError) {
                        return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to insert nodes ${inserted.error?.error}`)))
                    }
                }

                if(edgesToInsert.length > 0) {
                    edgesToInsert.forEach(edge => {
                        edge.container_id = this.DataSourceRecord!.container_id!
                        edge.graph_id = graphID,
                            edge.data_source_id = this.DataSourceRecord!.id!
                    })

                    const inserted = await edgeRepository.bulkSave(this.DataSourceRecord!.modified_by!, edgesToInsert, transactionClient)
                    if(inserted.isError) {
                        return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to insert nodes ${inserted.error?.error}`)))
                    }
                }

                const marked = await stagingRepo.setInserted(row, transactionClient)
                if (marked.isError) {
                    // update the individual data row which failed
                    await stagingRepo.addError(row.id!, `error attempting to mark data inserted ${marked.error}` )

                    return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to mark data inserted ${marked.error}`)))
                }
            }
        }

        return new Promise(resolve => resolve(Result.Success(true)))
    }

    ToSave(): Promise<DataSourceRecord> {
        // no additional processing is needed on the record prior to storage
        return Promise.resolve(this.DataSourceRecord!)
    }

    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}
