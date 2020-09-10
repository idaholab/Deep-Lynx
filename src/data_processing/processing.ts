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
import {QueryConfig} from "pg";
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

           const incompleteImports = await ImportStorage.Instance.ListUncompleted(this.dataSource.id!, 0, 1)
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

        // an import must have all its data mapped to existing types prior to insertion. This is done so that we can
        // handle a set of relationships and data at the same time - as well as insuring that data is processed in the
        // order its received.
        const unmappedData = await ds.CountUnmappedData(dataImportID)
        if(unmappedData.isError || unmappedData.value > 0) {
            await ImportStorage.Instance.SetErrors(dataImportID, ["import has unmapped data, resolve by creating type mappings"])

            return new Promise(resolve => resolve(Result.SilentFailure(`data import has unmapped data, resolve by creating type mappings`)))
        }

        const totalToProcess = await ds.Count(dataImportID)
        if(totalToProcess.isError) return new Promise(resolve => resolve(Result.Pass(totalToProcess)))

        const nodesToInsert: NodeT[] = []

        const edgesToInsert: EdgeT[] = []

        // so as to not swamp memory we process in batches, batch size determined by config.
        for(let i = 0; i < totalToProcess.value ; i++) {
           const toProcess = await ds.ListUnprocessed(dataImportID, i * Config.data_source_batch_size, Config.data_source_batch_size)
           if(toProcess.isError) {
                await ImportStorage.Instance.SetErrors(dataImportID, [`error attempting to fetch from data_staging ${toProcess.error?.error}`])

                return new Promise(resolve => resolve(Result.Failure(`error attempting to fetch from data_staging ${toProcess.error?.error}`)))
            }

           if(toProcess.value.length === 0) break;

           for(const row of toProcess.value) {
                const mapping = await TypeMappingStorage.Instance.Retrieve(row.mapping_id)
                if(mapping.isError) {
                   await ImportStorage.Instance.SetErrors(dataImportID, [`error attempting to fetch type mapping ${mapping.error?.error}`])

                   return new Promise(resolve => resolve(Result.Failure(`error attempting to fetch type mapping ${mapping.error?.error}`)))
               }

                // use the type mapping assigned to a piece of data to transform it prior to insertion into the graph database.
                const transformedPayload = await TransformPayload(mapping.value, row.data as {[key:string]: any})
                if(transformedPayload.isError) {
                   await ImportStorage.Instance.SetErrors(dataImportID, [`error attempting to transform data ${transformedPayload.error?.error}`])

                   return new Promise(resolve => resolve(Result.Failure(`error attempting to transform data ${transformedPayload.error?.error}`)))
               }

                if(nodeT.is(transformedPayload.value)) {
                    nodesToInsert.push(transformedPayload.value)
                }

                if(edgeT.is(transformedPayload.value)) {
                    edgesToInsert.push(transformedPayload.value)
                }

                if(transformedPayload.value instanceof Array) {
                    nodesToInsert.push(transformedPayload.value[0])
                    edgesToInsert.push(transformedPayload.value[1])
                }
            }

        }


        const processQueries: QueryConfig[] = []

        if(nodesToInsert.length > 0) {
            // insert all nodes first, then edges
            const insertedNodes = await NodeStorage.Instance.CreateOrUpdateStatement(this.dataSource.container_id!, this.graphID, nodesToInsert)
            if(insertedNodes.isError) {
                await ImportStorage.Instance.SetErrors(dataImportID, [`error attempting to insert nodes ${insertedNodes.error?.error}`])

                return new Promise(resolve => resolve(Result.Failure(`error attempting to insert nodes ${insertedNodes.error?.error}`)))
            }

            processQueries.push(...insertedNodes.value)
        }

        if(edgesToInsert.length > 0) {
            const insertedEdges = await EdgeStorage.Instance.CreateOrUpdateStatement(this.dataSource.container_id!, this.graphID, edgesToInsert)
            if(insertedEdges.isError) {
                await ImportStorage.Instance.SetErrors(dataImportID, [`error attempting to insert edges ${insertedEdges.error?.error}`])

                return new Promise(resolve => resolve(Result.Failure(`error attempting to insert edges ${insertedEdges.error?.error}`)))
            }

            processQueries.push(...insertedEdges.value)
        }

        // insert into graph TODO: This is a hacky workaround for using the postgres classes "Run as transaction" feature, fix it
        const inserted = await GraphStorage.Instance.InsertNodesAndEdges(processQueries)
        if(inserted.isError || !inserted.value) return new Promise(resolve => resolve(Result.Failure('unable to insert into database')))

        const setProcessed = await DataStagingStorage.Instance.SetProcessed(dataImportID)
        if(setProcessed.isError || !setProcessed.value) Logger.debug(`unable to set data import ${dataImportID} to processed`)

        return ImportStorage.Instance.SetStopped(dataImportID)
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
    let timeLastRan = new Date()
    let i = 0

    while(true) {
        // run type mapping set stored procedure - this will assign type mappings if some exist for data currently
        TypeMappingStorage.Instance.SetAllTypeMappings()

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


