import {DataSourceT} from "../types/import/dataSourceT";
import Logger from "../logger"
import Config from "../config"
import Result from "../result";
import DataStagingStorage from "../data_mappers/import/data_staging_storage";
import ImportStorage from "../data_mappers/import/import_storage";
import {EdgeT, edgeT} from "../types/graph/edgeT";
import {NodeT, nodeT} from "../types/graph/nodeT";
import TypeMappingStorage from "../data_mappers/import/type_mapping_storage";
import NodeStorage from "../data_mappers/graph/node_storage";
import GraphStorage from "../data_mappers/graph/graph_storage";
import EdgeStorage from "../data_mappers/graph/edge_storage";
import DataSourceStorage from "../data_mappers/import/data_source_storage";
import TypeTransformationStorage from "../data_mappers/import/type_transformation_storage";
import {ApplyTransformation, IsEdges, IsNodes} from "./type_mapping";
import {ImportT} from "../types/import/importT";
import {PoolClient} from "pg";

// DataSourceProcessor starts an unending processing loop for a data source. This
// loop is what takes mapped data from data_staging and inserts it into the actual
// database
export class DataSourceProcessor {
    private dataSource: DataSourceT;
    private readonly graphID: string

    constructor(dataSource: DataSourceT, graphID: string) {
        this.dataSource = dataSource
        this.graphID = graphID
    }

    // Process will attempt to process the most recent data import for the data source
    // if it cannot it will record the error and sleep a set interval before trying again
    // Imports must be processed in order, each must have all previous imports before it
    // handled.
    public async Process() {
        while(true) {
            const active = await DataSourceStorage.Instance.IsActive(this.dataSource.id!)
            if(active.isError || !active.value) break;

            const incompleteImports = await ImportStorage.Instance.ListIncompleteWithUninsertedData(this.dataSource.id!)
            if(!incompleteImports.isError) {
                for(const incompleteImport of incompleteImports.value) {
                    // we must wrap this insert as a transaction so that we are able to
                    // lock the individual row for processing.
                    // we won't pass the transaction into every function, only the updates
                    const importTransaction = await ImportStorage.Instance.startTransaction()
                    if(importTransaction.isError) {
                        Logger.debug(`error attempting to start db transaction for import ${importTransaction.error}`)
                        continue
                    }

                    // attempt to retrieve and lock the record for processing
                    const dataImport = await ImportStorage.Instance.RetrieveAndLock(incompleteImport.id, importTransaction.value)
                    if(dataImport.isError) {
                        await ImportStorage.Instance.completeTransaction(importTransaction.value)

                        Logger.debug(`error obtaining lock on import record ${dataImport.error}`)
                        continue
                    }


                    const processed = await this.process(incompleteImport, importTransaction.value)

                    if(processed.isError) {
                        Logger.debug(`import ${incompleteImport.id} incomplete: ${processed.error?.error!}`)

                        const set = await ImportStorage.Instance.SetStatus(incompleteImport.id, "error", `error attempting to process import ${processed.error?.error}`, importTransaction.value)
                        if(set.isError) Logger.debug(`error attempting to update import status ${set.error}`)

                        await ImportStorage.Instance.completeTransaction(importTransaction.value)
                        continue
                    }

                    // check to see if import is now complete. If so, mark completed.
                    const count = await DataStagingStorage.Instance.CountUninsertedForImport(incompleteImport.id)
                    if(count.isError) {
                        const set = await ImportStorage.Instance.SetStatus(incompleteImport.id, "error", `error attempting to count records ${count.error}`, importTransaction.value)
                        if(set.isError) Logger.debug(`error attempting to update import status ${set.error}`)

                        await ImportStorage.Instance.completeTransaction(importTransaction.value)
                        continue
                    }

                    if(count.value === 0) {
                        const set = await ImportStorage.Instance.SetStatus(incompleteImport.id, "completed", undefined, importTransaction.value)
                        if(set.isError) Logger.debug(`error attempting to update import status ${set.error}`)

                        await ImportStorage.Instance.completeTransaction(importTransaction.value)
                        continue
                    }

                    const set = await  ImportStorage.Instance.SetStatus(incompleteImport.id, "processing", undefined, importTransaction.value)
                    if(set.isError) Logger.debug(`error attempting to update import status ${set.error}`)
                    await ImportStorage.Instance.completeTransaction(importTransaction.value)
                }
            }

            await this.delay(Config.data_source_poll_interval)
        }
    }

    public async process(dataImport: ImportT, transactionClient: PoolClient): Promise<Result<boolean>> {
        const ds = DataStagingStorage.Instance

        // attempt to process only those records which have active type mappings
        // with transformations
        const totalToProcess = await ds.CountUninsertedActiveMapping(dataImport.id)
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
            const toProcess = await ds.ListUninsertedActiveMapping(dataImport.id, i * Config.data_source_batch_size, Config.data_source_batch_size)
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
                const mapping = await TypeMappingStorage.Instance.Retrieve(row.mapping_id)
                if(mapping.isError) {
                    return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to fetch type mapping ${mapping.error?.error}`)))
                }

                const transformations = await TypeTransformationStorage.Instance.ListForTypeMapping(mapping.value.id!)
                if(transformations.isError) {
                    return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to fetch type mapping transformations ${transformations.error?.error}`)))
                }

                const nodesToInsert: NodeT[] = []
                const edgesToInsert: EdgeT[] = []

                // for each transformation run the transformation process. Results will either be an array of nodes or an array of edges
                // if we run into errors, add the error to the data staging row, and immediately return. Do not attempt to
                // run any more transformations
                for(const transformation of transformations.value) {
                    const results = await ApplyTransformation(mapping.value, transformation, row)
                    if(results.isError) {
                        await DataStagingStorage.Instance.AddError(row.id, `unable to apply transformation ${transformation.id} to data ${row.id}: ${results.error}`)
                        await GraphStorage.Instance.rollbackTransaction(transactionClient)

                        return new Promise(resolve => resolve(Result.SilentFailure(`unable to apply transformation ${transformation.id} to data ${row.id}: ${results.error}`)))
                    }

                    // check to see result type, force into corresponding container
                    if(IsNodes(results.value)) nodesToInsert.push(...results.value)
                    if(IsEdges(results.value)) edgesToInsert.push(...results.value)
                }

                // insert all nodes first, then edges
                if(nodesToInsert.length > 0) {
                    for(const node of nodesToInsert) {
                        const insertedNodes = await NodeStorage.Instance.CreateOrUpdateStatement(this.dataSource.container_id!, this.graphID, [node])
                        if (insertedNodes.isError) {
                            await GraphStorage.Instance.rollbackTransaction(transactionClient)

                            // update the individual data row which failed
                            await DataStagingStorage.Instance.AddError(node.data_staging_id!, `error attempting to insert nodes ${insertedNodes.error?.error}` )

                            return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to insert nodes ${insertedNodes.error?.error}`)))
                        }

                        const inserted = await GraphStorage.Instance.runInTransaction(transactionClient, ...insertedNodes.value)
                        if (inserted.isError) {
                            await GraphStorage.Instance.rollbackTransaction(transactionClient)

                            // update the individual data row which failed
                            await DataStagingStorage.Instance.AddError(node.data_staging_id!, `error attempting to insert nodes ${inserted.error?.error}` )

                            return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to insert nodes ${inserted.error?.error}`)))

                        }
                    }

                }

                if(edgesToInsert.length > 0) {
                    for(const edge of edgesToInsert) {
                        // we must also pass the transaction client to this function so that the edge verification of origin/destination
                        // node can take place even if there are new nodes coming in that are part of this transaction
                        const insertedEdges = await EdgeStorage.Instance.CreateOrUpdateStatement(this.dataSource.container_id!, this.graphID, [edge], transactionClient)
                        if(insertedEdges.isError) {
                            await GraphStorage.Instance.rollbackTransaction(transactionClient)

                            // update the individual data row which failed
                            await DataStagingStorage.Instance.AddError(edge.data_staging_id!, `error attempting to insert edges ${insertedEdges.error?.error}` )

                            return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to insert edges ${insertedEdges.error?.error}`)))
                        }

                        const inserted = await GraphStorage.Instance.runInTransaction(transactionClient, ...insertedEdges.value)
                        if (inserted.isError) {
                            await GraphStorage.Instance.rollbackTransaction(transactionClient)

                            // update the individual data row which failed
                            await DataStagingStorage.Instance.AddError(edge.data_staging_id!, `error attempting to insert edges ${inserted.error?.error}` )

                            return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to insert edges ${inserted.error?.error}`)))

                        }
                    }
                }

                const transactionComplete = await GraphStorage.Instance.completeTransaction(transactionClient)
                if (transactionComplete.isError || !transactionComplete.value) {
                    await GraphStorage.Instance.rollbackTransaction(transactionClient)

                    // update the individual data row which failed
                    await DataStagingStorage.Instance.AddError(row.id, `error attempting to finalize transaction of inserting nodes/edges` )

                    return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to finalize transaction of  inserting nodes/edges`)))
                }

                const marked = await DataStagingStorage.Instance.SetInserted(row.id)
                if (marked.isError) {
                    // update the individual data row which failed
                    await DataStagingStorage.Instance.AddError(row.id, `error attempting to mark data inserted ${marked.error}` )

                    return new Promise(resolve => resolve(Result.SilentFailure(`error attempting to mark data inserted ${marked.error}`)))
                }
            }
        }

        return new Promise(resolve => resolve(Result.Success(true)))
    }


    // allows us to add a delay into another function easily
    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// StartDataProcessing is used on application startup to ensure that all existing data sources
// have their data processing loops started. This will only start active data sources. Its up to
// the individual data sources to handle restarting their processing loops on switching to active.
export async function StartDataProcessing(): Promise<Result<boolean>> {
    Logger.info('starting data processing')
    let timeLastRan = new Date()
    let i = 0


    while(true) {
        let dataSources: DataSourceT[] = []

        // make sure we only ever start one processing loop per active data source
        if(i === 0) {
            const ds = await DataSourceStorage.Instance.ListActive()
            if(ds.isError) return new Promise(resolve => resolve(Result.Failure('unable to query active data sources')))

            dataSources = ds.value
        } else {
            const ds = await DataSourceStorage.Instance.ListActiveSince(timeLastRan)
            if(ds.isError) return new Promise(resolve => resolve(Result.Failure('unable to query active data sources')))

            dataSources =  ds.value
        }

        timeLastRan = new Date()

        // we must have a graph record created for the container each data source belongs to, this ensures that it
        // exists before processing begins.
        for(const dataSource of dataSources) {
            let activeGraph = await GraphStorage.Instance.ActiveForContainer(dataSource.container_id!)
            if(activeGraph.isError || !activeGraph.value) {
                const graph = await GraphStorage.Instance.Create(dataSource.container_id!, "system")

                if(graph.isError) {
                    Logger.error(`unable to create graph for container ${dataSource.container_id} for data processing loop`)
                    continue;
                }

                const set = await GraphStorage.Instance.SetActiveForContainer(dataSource.container_id!, graph.value.id!)
                if(set.isError) {
                    Logger.error(`unable to set active graph for container ${dataSource.container_id} for data processing loop`)
                    continue;
                }

                activeGraph = await GraphStorage.Instance.ActiveForContainer(dataSource.container_id!)
                if(activeGraph.isError) {
                    Logger.error(`unable to get active graph for container ${dataSource.container_id}`)
                    continue
                }
            }

            const processor = new DataSourceProcessor(dataSource, activeGraph.value.graph_id)

            Logger.debug(`beginning data processing loop for data source ${dataSource.id}`)
            // async function that we don't want to wait for
            processor.Process()
        }

        i++
        await delay(1000)
    }

    return new Promise(resolve => resolve(Result.Success(true)))
}


