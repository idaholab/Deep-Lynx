import {workerData} from 'worker_threads';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import QueryStream from 'pg-query-stream';
import DataStagingMapper from '../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
import {Transform, TransformCallback} from 'stream';
import {from as copyFrom} from 'pg-copy-streams';
import {plainToInstance} from 'class-transformer';
import {GenerateEdges, GenerateNodes} from '../data_processing/process';
import {DataStaging} from '../domain_objects/data_warehouse/import/import';
import Papa from 'papaparse';
import Logger from '../services/logger';
import NodeMapper from '../data_access_layer/mappers/data_warehouse/data/node_mapper';
import EdgeMapper from '../data_access_layer/mappers/data_warehouse/data/edge_mapper';
import {pipeline} from 'node:stream/promises';

async function Start(): Promise<void> {
    await PostgresAdapter.Instance.init();
    const client = await PostgresAdapter.Instance.Pool.connect();

    // we're going to use the importIDs three times; once to process all the nodes
    // once to process all the edges and once to attach tags and files to nodes/edges
    // this allows us to at least ensure some kind of order in dealing with building edges
    // without having to do edge queues and gets us some performance gains vs constantly reaching back to the db
    const importIDs: string[] = workerData.input;

    // iterate through the staging data stream and generate the nodes, use the COPY command to insert the nodes
    // and the COPY ON CONFLICT command to update the data staging records with nodes_inserted flag updated to show
    // we've generated and inserted the nodes - do the same thing for edges
    const nodeReadStream = client.query(new QueryStream(DataStagingMapper.Instance.listImportActiveMappingStatementNodes(importIDs)));
    const nodeTableStream = client.query(copyFrom('COPY nodes FROM STDIN'));

    let firstIteration = true;
    // build a transform stream that outputs nodes as csv data
    class NodeTransform extends Transform {
        constructor() {
            super({
                objectMode: true,
                transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
                    const stagingRecord = plainToInstance(DataStaging, chunk as object);
                    // take the chunk, which is a data staging record, and generate nodes from it.
                    GenerateNodes(stagingRecord)
                        .then((nodes) => {
                            // convert to csv, only outputting the headers on the first iteration through to avoid
                            // breaking the copy from
                            if (nodes.length > 0) this.push(firstIteration ? Papa.unparse(nodes, {header: true}) : Papa.unparse(nodes, {header: false}));
                            firstIteration = false;
                            callback();
                        })
                        .catch((e: Error) => {
                            Logger.error(`error in generating nodes ${JSON.stringify(e)}`);
                            callback();
                        });
                },
            });
        }
    }

    nodeReadStream.on('error', (e: Error) => {
        Logger.error(`unexpected error in querying nodes for processing thread ${JSON.stringify(e)}`);
    });

    nodeTableStream.on('error', (e: Error) => {
        Logger.error(`unexpected error in inserting nodes in the processing thread ${JSON.stringify(e)}`);
    });

    // pipe the query stream first to the transform stream to generate nodes, then to the table stream to insert them
    await pipeline(nodeReadStream, new NodeTransform(), nodeTableStream);

    // mark the nodes processed
    const nodesProcessed = await DataStagingMapper.Instance.MarkNodesProcessed(importIDs);
    if (nodesProcessed.isError) Logger.error(`unexpected error marking nodes processed in the processing thread ${JSON.stringify(nodesProcessed.error)}`);

    // now that we've done the nodes - move on and do the same thing for the edges
    const edgeReadStream = client.query(new QueryStream(DataStagingMapper.Instance.listImportActiveMappingStatementEdges(importIDs)));
    const edgeTableStream = client.query(copyFrom('COPY edges FROM STDIN'));

    firstIteration = true;

    // build a transform stream that outputs edges as csv data
    class EdgeTransform extends Transform {
        constructor() {
            super({
                objectMode: true,
                transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
                    const stagingRecord = plainToInstance(DataStaging, chunk as object);
                    // take the chunk, which is a data staging record, and generate nodes from it.
                    GenerateEdges(stagingRecord)
                        .then((edges) => {
                            // convert to csv, only outputting the headers on the first iteration through to avoid
                            // breaking the copy from
                            if (edges.length > 0) this.push(firstIteration ? Papa.unparse(edges, {header: true}) : Papa.unparse(edges, {header: false}));
                            firstIteration = false;
                            callback();
                        })
                        .catch((e: Error) => {
                            Logger.error(`error in generating edges ${JSON.stringify(e)}`);
                            callback();
                        });
                },
            });
        }
    }

    edgeReadStream.on('error', (e: Error) => {
        Logger.error(`unexpected error in querying edges for processing thread ${JSON.stringify(e)}`);
    });

    edgeTableStream.on('error', (e: Error) => {
        Logger.error(`unexpected error in inserting edges in the processing thread ${JSON.stringify(e)}`);
    });

    // pipe the query stream first to the transform stream to generate edges, then to the table stream to insert them
    await pipeline(edgeReadStream, new EdgeTransform(), edgeTableStream);
    // mark the edges processed
    const edgesProcessed = await DataStagingMapper.Instance.MarkEdgesProcessed(importIDs);
    if (edgesProcessed.isError) Logger.error(`unexpected error marking edges processed in the processing thread ${JSON.stringify(edgesProcessed.error)}`);

    // now we need to attach the tags/files for all the newly created nodes and edges
    let result = await NodeMapper.Instance.AttachTagsForImport(importIDs);
    if (result.isError) Logger.error(`unexpected error attaching tags to nodes in the processing thread ${JSON.stringify(result.error)}`);

    result = await EdgeMapper.Instance.AttachTagsForImport(importIDs);
    if (result.isError) Logger.error(`unexpected error attaching tags to edges in the processing thread ${JSON.stringify(result.error)}`);

    result = await NodeMapper.Instance.AttachFilesForImport(importIDs);
    if (result.isError) Logger.error(`unexpected error attaching files to nodes in the processing thread ${JSON.stringify(result.error)}`);

    result = await EdgeMapper.Instance.AttachFilesForImport(importIDs);
    if (result.isError) Logger.error(`unexpected error attaching files to edges in the processing thread ${JSON.stringify(result.error)}`);

    process.exit(0);
}

void Start();
