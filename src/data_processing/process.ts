import {DataStaging} from '../domain_objects/data_warehouse/import/import';
import Result from '../common_classes/result';
import DataStagingMapper from '../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
import TypeMappingRepository from '../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import TypeMapping from '../domain_objects/data_warehouse/etl/type_mapping';
import {ReturnSuperUser, SuperUser} from '../domain_objects/access_management/user';
import FileMapper from '../data_access_layer/mappers/data_warehouse/data/file_mapper';
import Logger from '../services/logger';
import NodeRepository from '../data_access_layer/repositories/data_warehouse/data/node_repository';
import Node, {IsNodes} from '../domain_objects/data_warehouse/data/node';
import {EdgeQueueItem, IsEdges} from '../domain_objects/data_warehouse/data/edge';
import DataStagingRepository from '../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import {DataStagingFile, NodeFile} from '../domain_objects/data_warehouse/data/file';
import NodeMapper from '../data_access_layer/mappers/data_warehouse/data/node_mapper';
import EdgeQueueItemMapper from '../data_access_layer/mappers/data_warehouse/data/edge_queue_item_mapper';
import {classToPlain} from 'class-transformer';
import {MappingTag} from '../domain_objects/data_warehouse/etl/type_transformation';
import TagMapper from '../data_access_layer/mappers/data_warehouse/data/tag_mapper';

export type NodeTagAttachment = {
    tags: MappingTag[];
    originalDataIDs: string[];
};

// ProcessData accepts a data staging record and inserts nodes and edges based
// on matching transformation records - this acts on a single record
export async function ProcessData(...staging: DataStaging[]): Promise<Result<boolean>> {
    const stagingMapper = DataStagingMapper.Instance;
    const stagingRepo = new DataStagingRepository();
    const mappingRepo = new TypeMappingRepository();
    const nodeRepository = new NodeRepository();

    const transaction = await stagingMapper.startTransaction();

    const records = staging.map((s) => {
        if (!s.shape_hash) {
            const shapeHash = TypeMapping.objectToShapeHash(s.data, {
                value_nodes: s.data_source_config?.value_nodes,
                stop_nodes: s.data_source_config?.stop_nodes,
            });
            s.shape_hash = shapeHash;
        }

        return s;
    });

    // update the staging records with the shape-hash if needed
    await stagingRepo.bulkSave(records, transaction.value);

    // NOTE: this db call might return records which don't match the shapehash/data_source combo because we're passing
    // a lot of records at once to the call to minimize db round-trips. I think this is a good trade-off, but if we start
    // to see a lot of slowdowns - this might be a likely candidate
    const all_mappings = await mappingRepo
        .where()
        .shape_hash(
            'in',
            records.map((s) => s.shape_hash),
        )
        .and()
        .dataSourceID(
            'in',
            records.map((s) => s.data_source_id),
        )
        .list(true, undefined, transaction.value);

    // hold for insert
    let nodesToInsert: Node[] = []; // holds all nodes to insert
    let nodesToMerge: Node[] = []; // holds node to be inserted via merge
    let nodesToOverwrite: Node[] = []; // holds nodes to be inserted via overwrite
    const tagsToAttachNodes: NodeTagAttachment[] = [];
    let edgesToQueue: EdgeQueueItem[] = [];

    // we also need to pull any files attached to the staging records for eventual attachment ot nodes etc.
    // we must fetch the file records for these data staging records, so that once they're processed we can attach
    // the files to the resulting nodes/edges - this is not a failure state if we can't fetch them - log and move on
    let stagingFiles: DataStagingFile[] = [];

    const files = await FileMapper.Instance.ListForDataStagingRaw(...records.filter((r) => r.file_attached).map((r) => r.id));
    if (files.isError) {
        Logger.error(`unable to fetch files for data staging records ${files.error?.error}`);
    } else {
        stagingFiles = files.value;
    }

    for (const record of records) {
        const errors = await record.validationErrors();
        if (errors) {
            await stagingRepo.addError(record.id!, 'data does not pass validation for processing');
            continue;
        }

        // pull the mappings out
        let mappings = all_mappings.value.filter((m) => m.data_source_id === record.data_source_id && m.shape_hash === record.shape_hash);

        if (mappings.length === 0) {
            const inserted = await mappingRepo.save(
                new TypeMapping({
                    container_id: record.container_id!,
                    data_source_id: record.data_source_id!,
                    sample_payload: record.data,
                    shape_hash: record.shape_hash,
                }),
                await ReturnSuperUser(),
            );

            await stagingRepo.setErrors(record.id!, ['no active transformations for type mapping']);

            if (inserted.isError) {
                Logger.error('unable to insert mapping into database', inserted.error);
            }

            continue;
        }

        mappings = mappings.filter((m) => m.active);
        if (mappings.length === 0) {
            await stagingRepo.setErrors(record.id!, ['no active type mapping for record']);
            continue;
        }

        // for each transformation run the transformation process. Results will either be an array of nodes or an array of edges
        // if we run into errors, add the error to the data staging row, and immediately return. Do not attempt to
        // run any more transformations
        for (const mapping of mappings) {
            if (mapping.transformations)
                for (const transformation of mapping.transformations) {
                    // skip if the transformation is archived
                    if (transformation.archived) continue;

                    // keep in mind that any conversion errors that didn't cause the complete failure of the transformation
                    // will be contained in the metadata object on the transformed object
                    const results = await transformation.applyTransformation(record);
                    if (results.isError) {
                        await stagingRepo.setErrors(record.id!, [`unable to apply transformation ${transformation.id} to data: ${results.error?.error}`]);
                        continue;
                    }

                    // check to see result type, force into corresponding container
                    if (IsNodes(results.value)) {
                        nodesToInsert.push(...results.value);
                        if (transformation.tags)
                            tagsToAttachNodes.push({
                                tags: [transformation.tags].flat(),
                                originalDataIDs: results.value.map((result) => {
                                    return result.original_data_id!;
                                }),
                            });
                        if (transformation.merge) {
                            nodesToMerge.push(...results.value);
                        } else {
                            nodesToOverwrite.push(...results.value);
                        }
                    }

                    if (IsEdges(results.value)) {
                        edgesToQueue = edgesToQueue.concat(
                            results.value.map((e) => {
                                if (transformation.tags) {
                                    return new EdgeQueueItem({
                                        edge: classToPlain(e),
                                        import_id: record.import_id!,
                                        file_attached: record.file_attached,
                                        tags: [transformation.tags].flat(),
                                    });
                                } else {
                                    return new EdgeQueueItem({
                                        edge: classToPlain(e),
                                        import_id: record.import_id!,
                                        file_attached: record.file_attached,
                                    });
                                }
                            }),
                        );
                    }
                }
        }
    }

    // we must deduplicate nodes based on original ID in order to avoid a database transaction error. We toss out the
    // duplicates because even if we inserted them they'd be overwritten, or overwrite, the original. Users should be made
    // aware that if their import is generating records with the same original ID only one instance is going to be inserted
    nodesToInsert = nodesToInsert.filter((value, index, self) => index === self.findIndex((t) => t.original_data_id === value.original_data_id));
    nodesToMerge = nodesToMerge.filter((value, index, self) => index === self.findIndex((t) => t.original_data_id === value.original_data_id));
    nodesToOverwrite = nodesToOverwrite.filter((value, index, self) => index === self.findIndex((t) => t.original_data_id === value.original_data_id));

    // insert all nodes and files
    if (nodesToInsert.length > 0) {
        // insert nodes grouped by merge/overwrite
        if (nodesToMerge.length > 0) {
            const inserted = await nodeRepository.bulkSave(SuperUser, nodesToMerge, transaction.value, true);
            if (inserted.isError) {
                await stagingMapper.rollbackTransaction(transaction.value);

                for (const record of records) {
                    await stagingRepo.setErrors(record.id!, [`error attempting to insert nodes ${inserted.error?.error}`]);
                }
                return new Promise((resolve) => resolve(Result.DebugFailure(`error attempting to insert nodes ${inserted.error?.error}`)));
            }
        }

        if (nodesToOverwrite.length > 0) {
            const inserted = await nodeRepository.bulkSave(SuperUser, nodesToOverwrite, transaction.value, false);
            if (inserted.isError) {
                await stagingMapper.rollbackTransaction(transaction.value);

                for (const record of records) {
                    await stagingRepo.setErrors(record.id!, [`error attempting to insert nodes ${inserted.error?.error}`]);
                }
                return new Promise((resolve) => resolve(Result.DebugFailure(`error attempting to insert nodes ${inserted.error?.error}`)));
            }
        }

        // now that the nodes are inserted, attempt to attach any files from their original staging records
        // to them
        if (stagingFiles.length > 0) {
            const nodeFiles: NodeFile[] = [];

            // we must find the node ID to attach a file to it,
            // even if the node entry was dropped due to duplicate data
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

            if (!listed.isError) {
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
                Logger.error(`unable to attach files to nodes ${attached.error}`);
            }
        }

        // attach the nodes to any tags specified in the transformation
        if (tagsToAttachNodes.length > 0) {
            for (const attachmentTag of tagsToAttachNodes) {
                // create a list of relevant Node IDs for this set of tags and original data IDs
                const nodeIDs = [];
                const listed = await new NodeRepository()
                    .where()
                    .originalDataID('in', attachmentTag.originalDataIDs)
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

                if (!listed.isError) {
                    for (const node of nodesToInsert) {
                        let nodeID: string | undefined;
                        if (node.id && attachmentTag.originalDataIDs.includes(node.original_data_id!)) {
                            nodeID = node.id;
                        } else if (listed.value.length > 0) {
                            const relevantNodes = listed.value.filter((n) => {
                                return (
                                    n.original_data_id === node.original_data_id &&
                                    n.data_source_id === node.data_source_id &&
                                    n.container_id === node.container_id
                                );
                            });
                            nodeID = relevantNodes.length > 0 ? relevantNodes[0].id! : undefined;
                        } else {
                            nodeID = undefined;
                        }
                        if (nodeID) nodeIDs.push(nodeID);
                    }
                }

                // attach each supplied tag to the matching nodes, ensuring we have an array
                for (const tag of [attachmentTag.tags].flat()) {
                    const tagResult = await TagMapper.Instance.BulkTagNode(tag.id!, nodeIDs, transaction.value);
                    if (tagResult.isError) {
                        Logger.error(`unable to attach tag ${tag.id} to nodes ${nodeIDs} during ` + `data staging process ${tagResult.error?.error}`);
                    }
                }
            }
        }
    }

    // send queue edges to queue
    if (edgesToQueue.length > 0) {
        const sent = await EdgeQueueItemMapper.Instance.BulkCreate(edgesToQueue, transaction.value);
        if (sent.isError) {
            await stagingMapper.rollbackTransaction(transaction.value);

            await stagingRepo.setErrorsMultiple(
                records.map((r) => r.id!),
                [`error attempting to send edges to queue ${sent.error?.error}`],
            );
            return new Promise((resolve) => resolve(Result.DebugFailure(`error attempting to send edges to queue ${sent.error?.error}`)));
        }
    }

    const marked = await stagingRepo.setMultipleInserted(records, transaction.value);
    if (marked.isError) {
        await stagingMapper.rollbackTransaction(transaction.value);

        // update the individual data row which failed
        await stagingRepo.setErrorsMultiple(
            records.map((r) => r.id!),
            [`error attempting to mark data inserted ${marked.error}`],
        );
        return new Promise((resolve) => resolve(Result.DebugFailure(`error attempting to mark data inserted ${marked.error}`)));
    }

    await stagingRepo.setErrorsMultiple(
        records.map((r) => r.id!),
        [],
        transaction.value,
    );
    await stagingMapper.completeTransaction(transaction.value);
    return Promise.resolve(Result.Success(true));
}
