import {workerData} from 'worker_threads';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import QueryStream from 'pg-query-stream';
import DataStagingMapper from '../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
import {Transform, TransformCallback} from 'stream';
import {from as copyFrom} from 'pg-copy-streams';
import {instanceToPlain, plainToInstance} from 'class-transformer';
import {GenerateEdges, GenerateNodes} from '../data_processing/process';
import {DataStaging} from '../domain_objects/data_warehouse/import/import';
import Papa from 'papaparse';
import Logger from '../services/logger';
import NodeMapper from '../data_access_layer/mappers/data_warehouse/data/node_mapper';
import EdgeMapper from '../data_access_layer/mappers/data_warehouse/data/edge_mapper';
import {pipeline} from 'node:stream/promises';
import ImportRepository from '../data_access_layer/repositories/data_warehouse/import/import_repository';
import {SnapshotGenerator} from 'deeplynx';
import Config from '../services/config';
import Edge from '../domain_objects/data_warehouse/data/edge';

async function Start(): Promise<void> {
    await PostgresAdapter.Instance.init();
    const client = await PostgresAdapter.Instance.Pool.connect();
    const insertClient = await PostgresAdapter.Instance.Pool.connect();

    // we're going to use the importIDs three times; once to process all the nodes
    // once to process all the edges and once to attach tags and files to nodes/edges
    // this allows us to at least ensure some kind of order in dealing with building edges
    // without having to do edge queues and gets us some performance gains vs constantly reaching back to the db
    const importIDs: string[] = workerData.input.importIDs;
    const containerID: string = workerData.input.containerID;

    // set process start time
    const importRepo = new ImportRepository();
    void (await importRepo.setStart(new Date(), importIDs));

    // iterate through the staging data stream and generate the nodes, use the COPY command to insert the nodes
    // into a temporary holding table without indexes, then pull them out again - note we're using two clients here,
    // we don't want to mix and match the insert stream with the query stream
    const nodeReadStream = client.query(new QueryStream(DataStagingMapper.Instance.listImportActiveMappingStatementNodes(importIDs)));
    const nodeTableStream = insertClient.query(
        copyFrom(`COPY 
    nodes_temp (
    properties,
    metadata_properties,
    container_id,
    metatype_id,
    data_staging_id,
    data_source_id,
    type_mapping_transformation_id,
    metadata,
    created_at,
    import_data_id,
    original_data_id
    ) 
    FROM STDIN WITH DELIMITER '|' CSV`),
    );

    // we use these columns to ensure that each object meets our strict definition prior to converting to CSV
    // unless we do this, a single object with an extra field will break the entire COPY function
    const cols = [
        'properties',
        'metadata_properties',
        'container_id',
        'metatype_id',
        'data_staging_id',
        'data_source_id',
        'type_mapping_transformation_id',
        'metadata',
        'created_at',
        'import_data_id',
        'original_data_id',
    ];

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
                            if (nodes.length > 0) {
                                // ensure all the nodes match the same structure
                                const parsedNodes = nodes.map((n) => {
                                    // eslint-disable-next-line security/detect-object-injection
                                    return Object.fromEntries(cols.map((col: string) => [col, instanceToPlain(n)[col]]));
                                });

                                const row = Papa.unparse(parsedNodes, {
                                    header: false,
                                    delimiter: '|',
                                    newline: '\r',
                                });

                                // you must add a carriage return since we're emulating the STDIN, and they expect each
                                // line to be ended by a carriage return
                                this.push(Buffer.from(row + '\r', 'utf-8'));
                            }

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
    insertClient.release();

    // before we can mark things processed, or attach files/tags to them, we need to move everything from the temp table
    // into the full nodes table - this patterns is repeated for the edges. This is still by far the fastest way to handle
    // these large inserts - instead of doing batch inserts of 1k nodes and having n/1000 number of statements, we're able
    // to cut every import to 3 statements no matter how large - the COPY, the move into the real table, the DELETE from temp
    // note that this function covers the deletion from temp as well
    const moved = await NodeMapper.Instance.MoveFromTemp(importIDs);
    if (moved.isError) {
        Logger.error(`unexpected error in moving nodes from temp table in processing thread ${JSON.stringify(moved.error)}`);
        process.exit(0);
    }

    // mark the nodes processed
    const nodesProcessed = await DataStagingMapper.Instance.MarkNodesProcessed(importIDs);
    if (nodesProcessed.isError) Logger.error(`unexpected error marking nodes processed in the processing thread ${JSON.stringify(nodesProcessed.error)}`);

    // now that we've done the nodes - move on and do the same thing for the edges
    const edgeReadStream = client.query(new QueryStream(DataStagingMapper.Instance.listImportActiveMappingStatementEdges(importIDs)));
    const edgeInsertClient = await PostgresAdapter.Instance.Pool.connect();
    const edgeTableStream = edgeInsertClient.query(
        copyFrom(`COPY 
          edges_temp (
          container_id,
          relationship_pair_id,
          data_source_id,
          import_data_id,
          type_mapping_transformation_id,
          origin_id,
          destination_id,
          origin_original_id,
          origin_data_source_id,
          origin_metatype_id,
          destination_original_id,
          destination_data_source_id,
          destination_metatype_id,
          properties,
          metadata,
          created_at,
          deleted_at,
          created_by,
          modified_by,
          data_staging_id,
          metadata_properties
    )
    FROM STDIN WITH DELIMITER '|' CSV`),
    );

    const edgeCols = [
        'container_id',
        'relationship_pair_id',
        'data_source_id',
        'import_data_id',
        'type_mapping_transformation_id',
        'origin_id',
        'destination_id',
        'origin_original_id',
        'origin_data_source_id',
        'origin_metatype_id',
        'destination_original_id',
        'destination_data_source_id',
        'destination_metatype_id',
        'properties',
        'metadata',
        'created_at',
        'deleted_at',
        'created_by',
        'modified_by',
        'data_staging_id',
        'metadata_properties',
    ];

    const snapshot = new SnapshotGenerator();
    await snapshot.init({dbConnectionString: Config.core_db_connection_string}, containerID);

    // build a transform stream that outputs edges as csv data
    class EdgeTransform extends Transform {
        public generatePromises: Promise<Edge[]>[] = [];

        constructor() {
            super({
                objectMode: true,
                transform: (chunk: any, encoding: BufferEncoding, callback: TransformCallback) => {
                    const stagingRecord = plainToInstance(DataStaging, chunk as object);
                    this.generatePromises.push(GenerateEdges(snapshot, stagingRecord));

                    if (this.generatePromises.length > 100) {
                        const buffer = [...this.generatePromises];
                        this.generatePromises = [];

                        void Promise.all(buffer)
                            .then((edges) => {
                                const flat = edges.flat();
                                if (flat.length > 0) {
                                    // ensure all the edges match the same structure
                                    const parsedEdges = flat.map((e) => {
                                        return Object.fromEntries(edgeCols.map((col: string) => [col, instanceToPlain(e)[col]]));
                                    });

                                    const row = Papa.unparse(parsedEdges, {
                                        header: false,
                                        delimiter: '|',
                                        newline: '\r',
                                    });

                                    this.push(Buffer.from(row + '\r', 'utf-8'));
                                }

                                callback();
                            })
                            .catch((e: Error) => {
                                Logger.error(`error in generating edges ${JSON.stringify(e)}`);
                                callback();
                            });
                    } else {
                        callback();
                    }
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

    // again, move from temp table before the edges go through the rest of the process
    const edgesMoved = await EdgeMapper.Instance.MoveFromTemp(importIDs);
    if (edgesMoved.isError) {
        Logger.error(`unexpected error in moving nodes from temp table in processing thread ${JSON.stringify(edgesMoved.error)}`);
        process.exit(0);
    }

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

    // set end time of imports
    void (await importRepo.setEnd(new Date(), importIDs));

    process.exit(0);
}

void Start();
