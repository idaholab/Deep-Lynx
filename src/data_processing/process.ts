import {DataStaging} from '../domain_objects/data_warehouse/import/import';
import Result from '../common_classes/result';
import DataStagingMapper from '../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
import TypeMappingRepository from '../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import TypeMapping from '../domain_objects/data_warehouse/etl/type_mapping';
import {ReturnSuperUser} from '../domain_objects/access_management/user';
import FileMapper from '../data_access_layer/mappers/data_warehouse/data/file_mapper';
import Logger from '../services/logger';
import NodeRepository from '../data_access_layer/repositories/data_warehouse/data/node_repository';
import Node, {IsNodes} from '../domain_objects/data_warehouse/data/node';
import Edge, {EdgeQueueItem, IsEdges} from '../domain_objects/data_warehouse/data/edge';
import DataStagingRepository from '../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import {DataStagingFile, NodeFile} from '../domain_objects/data_warehouse/data/file';
import NodeMapper from '../data_access_layer/mappers/data_warehouse/data/node_mapper';
import Cache from '../services/cache/cache';
import Config from '../services/config';
import EdgeQueueItemMapper from '../data_access_layer/mappers/data_warehouse/data/edge_queue_item_mapper';
import {classToPlain} from 'class-transformer';

// ProcessData accepts a data staging record and inserts nodes and edges based
// on matching transformation records - this acts on a single record
export async function ProcessData(staging: DataStaging): Promise<Result<boolean>> {
    const stagingMapper = DataStagingMapper.Instance;
    const stagingRepo = new DataStagingRepository();
    const mappingRepo = new TypeMappingRepository();
    const nodeRepository = new NodeRepository();

    const transaction = await stagingMapper.startTransaction();

    // first thing we do is set the cache to a lower ttl for this import, indicating that we are currently processing it
    await Cache.set(`imports:${staging.import_id}`, {}, Config.import_cache_ttl);

    // pull the transformations, abort if none
    if (!staging.shape_hash) {
        const shapeHash = TypeMapping.objectToShapeHash(staging.data, {
            value_nodes: staging.data_source_config?.value_nodes,
            stop_nodes: staging.data_source_config?.stop_nodes,
        });
        staging.shape_hash = shapeHash;

        await stagingRepo.save(staging);
    }

    const mapping = await mappingRepo.findByShapeHash(staging.shape_hash!, staging.data_source_id!, true);

    const errors = await staging.validationErrors();
    if (errors) {
        await stagingRepo.addError(staging.id!, 'data does not pass validation for processing');
        return Promise.resolve(Result.DebugFailure(`data staging does not pass validation ${errors.join(',')}`));
    }

    // if we don't have the mapping, create one and abort the processing, as we have no transformations
    if (mapping.isError || !mapping.value.id) {
        await stagingMapper.completeTransaction(transaction.value);

        const inserted = await mappingRepo.save(
            new TypeMapping({
                container_id: staging.container_id!,
                data_source_id: staging.data_source_id!,
                sample_payload: staging.data,
                shape_hash: staging.shape_hash,
            }),
            await ReturnSuperUser(),
        );

        await stagingRepo.setErrors(staging.id!, ['no active transformations for type mapping']);

        if (inserted.isError) return Promise.resolve(Result.Pass(inserted));
        return Promise.resolve(Result.Success(true));
    }

    if (!mapping.value.active) {
        await stagingMapper.completeTransaction(transaction.value);
        await stagingRepo.setErrors(staging.id!, ['no active type mapping for record']);

        return Promise.resolve(Result.Success(true));
    }

    // we must fetch the file records for these data staging records, so that once they're processed we can attach
    // the files to the resulting nodes/edges - this is not a failure state if we can't fetch them - log and move on
    let stagingFiles: DataStagingFile[] = [];

    if (staging.file_attached) {
        const files = await FileMapper.Instance.ListForDataStagingRaw(staging.id!);
        if (files.isError) {
            Logger.error(`unable to fetch files for data staging records ${files.error?.error}`);
        } else {
            stagingFiles = files.value;
        }
    }

    let nodesToInsert: Node[] = [];
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
            const results = await transformation.applyTransformation(staging);
            if (results.isError) {
                await stagingMapper.rollbackTransaction(transaction.value);
                await stagingRepo.setErrors(staging.id!, [`unable to apply transformation ${transformation.id} to data: ${results.error?.error}`]);

                return new Promise((resolve) =>
                    resolve(Result.DebugFailure(`unable to apply transformation ${transformation.id} to data: ${results.error?.error}`)),
                );
            }

            // check to see result type, force into corresponding container
            if (IsNodes(results.value)) nodesToInsert.push(...results.value);
            if (IsEdges(results.value)) edgesToInsert.push(...results.value);
        }

    // we must deduplicate nodes based on original ID in order to avoid a database transaction error. We toss out the
    // duplicates because even if we inserted them they'd be overwritten, or overwrite, the original. Users should be made
    // aware that if their import is generating records with the same original ID only one instance is going to be inserted
    nodesToInsert = nodesToInsert.filter((value, index, self) => index === self.findIndex((t) => t.original_data_id === value.original_data_id));

    // insert all nodes and files
    if (nodesToInsert.length > 0) {
        const inserted = await nodeRepository.bulkSave(staging.data_source_id!, nodesToInsert, transaction.value);
        if (inserted.isError) {
            await stagingMapper.rollbackTransaction(transaction.value);

            await stagingRepo.setErrors(staging.id!, [`error attempting to insert nodes ${inserted.error?.error}`]);
            return new Promise((resolve) => resolve(Result.DebugFailure(`error attempting to insert nodes ${inserted.error?.error}`)));
        }

        // now that the nodes are inserted, attempt to attach any files from their original staging records
        // to them
        if (stagingFiles.length > 0) {
            const nodeFiles: NodeFile[] = [];

            // we must find the node ID to attach a file to it,
            // even if a the node entry was dropped due to duplicate data
            const listed = await new NodeRepository()
                .where()
                .originalDataID(
                    'in',
                    nodesToInsert.map((n) => n.original_data_id),
                )
                .and()
                .dataSourceID(
                    'in',
                    nodesToInsert.map((n) => n.data_source_id),
                )
                .and()
                .containerID(
                    'in',
                    nodesToInsert.map((n) => n.container_id),
                )
                .list();

            if (listed.isError) {
                await stagingRepo.addError(staging.id!, `unable to find node IDs for file attachment ${listed.error?.error}`);
            } else {
                nodesToInsert.forEach((node) => {
                    let nodeID: string | undefined;
                    if (node.id) {
                        nodeID = node.id;
                    } else if (listed.value.length > 0) {
                        const relevantNodes = listed.value.filter((n) => {
                            return (
                                n.original_data_id === node.original_data_id && n.data_source_id === node.data_source_id && n.container_id === node.container_id
                            );
                        });
                        nodeID = relevantNodes.length > 0 ? relevantNodes[0].id! : undefined;
                    } else {
                        nodeID = undefined;
                    }

                    const toAttach = stagingFiles.filter((stagingFile) => stagingFile.data_staging_id === node.data_staging_id);
                    if (toAttach) {
                        toAttach.forEach((stagingFile) => {
                            nodeFiles.push(
                                new NodeFile({
                                    node_id: nodeID!,
                                    file_id: stagingFile.file_id!,
                                }),
                            );
                        });
                    }
                });
            }

            const attached = await NodeMapper.Instance.BulkAddFile(nodeFiles, transaction.value);
            if (attached.isError) {
                await stagingRepo.addError(staging.id!, `unable to attach files to nodes during data staging process ${attached.error?.error}`);
            }
        }
    }

    // we send the edges to the edge queue item table so that they can be processed separately
    const edgesToQueue: EdgeQueueItem[] = edgesToInsert.map((e) => {
        return new EdgeQueueItem({edge: classToPlain(e), import_id: staging.import_id!, file_attached: staging.file_attached});
    });

    // send queue edges to queue
    if (edgesToQueue.length > 0) {
        const sent = await EdgeQueueItemMapper.Instance.BulkCreate(edgesToQueue, transaction.value);
        if (sent.isError) {
            await stagingMapper.rollbackTransaction(transaction.value);

            await stagingRepo.setErrors(staging.id!, [`error attempting to send edges to queue ${sent.error?.error}`]);
            return new Promise((resolve) => resolve(Result.DebugFailure(`error attempting to send edges to queue ${sent.error?.error}`)));
        }
    }

    const marked = await stagingRepo.setInserted(staging, transaction.value);
    if (marked.isError) {
        await stagingMapper.rollbackTransaction(transaction.value);

        // update the individual data row which failed
        await stagingRepo.setErrors(staging.id!, [`error attempting to mark data inserted ${marked.error}`]);
        return new Promise((resolve) => resolve(Result.DebugFailure(`error attempting to mark data inserted ${marked.error}`)));
    }

    await stagingRepo.setErrors(staging.id!, [], transaction.value);
    await stagingMapper.completeTransaction(transaction.value);
    return Promise.resolve(Result.Success(true));
}
