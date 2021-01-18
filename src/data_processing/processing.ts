import {DataSourceT} from "../types/import/dataSourceT";
import Logger from "../logger"
import Config from "../config"
import Result from "../result";
import DataStagingStorage from "../data_storage/import/data_staging_storage";
import ImportStorage from "../data_storage/import/import_storage";
import {EdgeT, edgeT} from "../types/graph/edgeT";
import {NodeT, nodeT} from "../types/graph/nodeT";
import {TransformPayload} from "./type_mapping";
import TypeMappingStorage from "../data_storage/import/type_mapping_storage";
import NodeStorage from "../data_storage/graph/node_storage";
import GraphStorage from "../data_storage/graph/graph_storage";
import EdgeStorage from "../data_storage/graph/edge_storage";
import DataSourceStorage from "../data_storage/import/data_source_storage";

// DataSourceProcessor starts an unending processing loop for a data source. This
// loop is what takes mapped data from data_staging and inserts it into the actual
// database
export class DataSourceProcessor {
    private dataSource: DataSourceT;
    private graphID: string

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
                   const processed = await this.process(incompleteImport.id)

                   if(processed.isError) {
                       Logger.debug(`import ${incompleteImport.id} incomplete: ${processed.error?.error!}`)
                   }
                   else Logger.info(`processing of import ${incompleteImport.id} complete`)
               }
           }

           await this.delay(Config.data_source_poll_interval)
       }
    }

    public async process(dataImportID: string): Promise<Result<boolean>> {
        const ds = DataStagingStorage.Instance

        const totalToProcess = await ds.Count(dataImportID)
        if(totalToProcess.isError) return new Promise(resolve => resolve(Result.Pass(totalToProcess)))

        const nodesToInsert: NodeT[] = []

        const edgesToInsert: EdgeT[] = []

        // so as to not swamp memory we process in batches, batch size determined by config.
        for(let i = 0; i < totalToProcess.value ; i++) {
           const toProcess = await ds.ListUninserted(dataImportID, i * Config.data_source_batch_size, Config.data_source_batch_size)
           if(toProcess.isError) {
                await ImportStorage.Instance.SetStatus(dataImportID, "error", `error attempting to fetch from data_staging ${toProcess.error?.error}`)

                return new Promise(resolve => resolve(Result.Failure(`error attempting to fetch from data_staging ${toProcess.error?.error}`)))
            }

           if(toProcess.value.length === 0) break;

           for(const row of toProcess.value) {
                const mapping = await TypeMappingStorage.Instance.Retrieve(row.mapping_id)
                if(mapping.isError) {
                   await ImportStorage.Instance.SetStatus(dataImportID, "error", `error attempting to fetch type mapping ${mapping.error?.error}`)

                   return new Promise(resolve => resolve(Result.Failure(`error attempting to fetch type mapping ${mapping.error?.error}`)))
               }

                // use the type mapping assigned to a piece of data to transform it prior to insertion into the graph database.
                const transformedPayload = await TransformPayload(mapping.value, row.data as {[key:string]: any})
                if(transformedPayload.isError) {
                   await ImportStorage.Instance.SetStatus(dataImportID,"error",  `error attempting to transform data ${transformedPayload.error?.error}`)

                   return new Promise(resolve => resolve(Result.Failure(`error attempting to transform data ${transformedPayload.error?.error}`)))
               }

                if(nodeT.is(transformedPayload.value)) {
                    transformedPayload.value.data_staging_id = row.id
                    transformedPayload.value.import_data_id = row.import_id
                    nodesToInsert.push(transformedPayload.value)
                }

                if(edgeT.is(transformedPayload.value)) {
                    transformedPayload.value.data_staging_id = row.id
                    transformedPayload.value.import_data_id = row.import_id
                    edgesToInsert.push(transformedPayload.value)
                }

                if(transformedPayload.value instanceof Array) {
                    transformedPayload.value[0].data_staging_id = row.id
                    transformedPayload.value[1].data_staging_id = row.id
                    transformedPayload.value[0].import_data_id = row.import_id
                    transformedPayload.value[1].import_data_id = row.import_id
                    nodesToInsert.push(transformedPayload.value[0])
                    edgesToInsert.push(transformedPayload.value[1])
                }
            }
        }

        // we must wrap this insert as a transaction so that if there are errors
        // we are capable of rolling back Deep Lynx's data to a point before the
        // import. Because we need the transaction client for edge verification
        // we'll use the transaction primitives of a storage class.
        const transaction = await GraphStorage.Instance.startTransaction()

        // insert all nodes first, then edges
        if(nodesToInsert.length > 0) {
            for(const node of nodesToInsert) {
                const insertedNodes = await NodeStorage.Instance.CreateOrUpdateStatement(this.dataSource.container_id!, this.graphID, [node])
                if (insertedNodes.isError) {
                    await ImportStorage.Instance.SetStatus(dataImportID, "error", `error attempting to insert nodes ${insertedNodes.error?.error}`)
                    await GraphStorage.Instance.rollbackTransaction(transaction.value)

                    // update the individual data row which failed
                    await DataStagingStorage.Instance.SetErrors(node.data_staging_id!, [`error attempting to insert nodes ${insertedNodes.error?.error}`] )

                    return new Promise(resolve => resolve(Result.Failure(`error attempting to insert nodes ${insertedNodes.error?.error}`)))
                }

                const inserted = await GraphStorage.Instance.runInTransaction(transaction.value, ...insertedNodes.value)
                if (inserted.isError) {
                    await ImportStorage.Instance.SetStatus(dataImportID, "error", `error attempting to insert nodes ${inserted.error?.error}`)
                    await GraphStorage.Instance.rollbackTransaction(transaction.value)

                    // update the individual data row which failed
                    await DataStagingStorage.Instance.SetErrors(node.data_staging_id!, [`error attempting to insert nodes ${inserted.error?.error}`] )

                    return new Promise(resolve => resolve(Result.Failure(`error attempting to insert nodes ${inserted.error?.error}`)))

                }
            }

        }

        if(edgesToInsert.length > 0) {
            for(const edge of edgesToInsert) {
                // we must also pass the transaction client to this function so that the edge verification of origin/destination
                // node can take place even if there are new nodes coming in that are part of this transaction
                const insertedEdges = await EdgeStorage.Instance.CreateOrUpdateStatement(this.dataSource.container_id!, this.graphID, [edge], transaction.value)
                if(insertedEdges.isError) {
                    await ImportStorage.Instance.SetStatus(dataImportID, "error",`error attempting to insert edges ${insertedEdges.error?.error}`)
                    await GraphStorage.Instance.rollbackTransaction(transaction.value)

                    // update the individual data row which failed
                    await DataStagingStorage.Instance.SetErrors(edge.data_staging_id!, [`error attempting to insert nodes ${insertedEdges.error?.error}`] )

                    return new Promise(resolve => resolve(Result.Failure(`error attempting to insert edges ${insertedEdges.error?.error}`)))
                }

                const inserted = await GraphStorage.Instance.runInTransaction(transaction.value, ...insertedEdges.value)
                if (inserted.isError) {
                    await ImportStorage.Instance.SetStatus(dataImportID, "error", `error attempting to insert edges ${inserted.error?.error}`)
                    await GraphStorage.Instance.rollbackTransaction(transaction.value)

                    // update the individual data row which failed
                    await DataStagingStorage.Instance.SetErrors(edge.data_staging_id!, [`error attempting to insert nodes ${inserted.error?.error}`] )

                    return new Promise(resolve => resolve(Result.Failure(`error attempting to insert edges ${inserted.error?.error}`)))

                }
            }
        }

        await GraphStorage.Instance.completeTransaction(transaction.value)

        const setProcessed = await DataStagingStorage.Instance.SetInserted(dataImportID)
        if(setProcessed.isError || !setProcessed.value) Logger.debug(`unable to set data import ${dataImportID} to processed`)

        return ImportStorage.Instance.SetStatus(dataImportID, "completed")
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
        // TODO: Type mapping assignment loop

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


