import {DataStaging} from '../domain_objects/data_warehouse/import/import';
import Result from '../common_classes/result';
import DataStagingMapper from '../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
import TypeMappingRepository from '../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import TypeMapping from '../domain_objects/data_warehouse/etl/type_mapping';
import {SuperUser} from '../domain_objects/access_management/user';
import FileMapper from '../data_access_layer/mappers/data_warehouse/data/file_mapper';
import Logger from '../services/logger';
import NodeRepository from '../data_access_layer/repositories/data_warehouse/data/node_repository';
import EdgeRepository from '../data_access_layer/repositories/data_warehouse/data/edge_repository';
import Node, {IsNodes} from '../domain_objects/data_warehouse/data/node';
import Edge, {IsEdges} from '../domain_objects/data_warehouse/data/edge';
import DataStagingRepository from '../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import {EdgeFile, NodeFile} from '../domain_objects/data_warehouse/data/file';
import NodeMapper from '../data_access_layer/mappers/data_warehouse/data/node_mapper';
import EdgeMapper from '../data_access_layer/mappers/data_warehouse/data/edge_mapper';

// ProcessData accepts a data staging record and inserts nodes and edges based
// on matching transformation records - this acts on a single record
export async function ProcessData(staging: DataStaging): Promise<Result<boolean>> {
    const stagingMapper = DataStagingMapper.Instance;
    const stagingRepo = new DataStagingRepository();
    const mappingRepo = new TypeMappingRepository();
    const nodeRepository = new NodeRepository();
    const edgeRepository = new EdgeRepository();

    const transaction = await stagingMapper.startTransaction();

    // pull the transformations, abort if none
    if (!staging.shape_hash) {
        const shapeHash = TypeMapping.objectToShapeHash(staging.data);
        staging.shape_hash = shapeHash;

        await stagingRepo.save(staging);
    }
    const mapping = await mappingRepo.findByShapeHash(staging.shape_hash!, staging.data_source_id!, true);

    const errors = await staging.validationErrors();
    if (errors) {
        await stagingRepo.addError(staging.id!, 'data does not pass validation for processing');
        return Promise.resolve(Result.SilentFailure(`data staging does not pass validation ${errors.join(',')}`));
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
            SuperUser,
        );

        await stagingRepo.addError(staging.id!, 'no transformations for type mapping');

        if (inserted.isError) return Promise.resolve(Result.Pass(inserted));
        return Promise.resolve(Result.Success(true));
    }

    if (!mapping.value.active) {
        await stagingMapper.completeTransaction(transaction.value);
        await stagingRepo.addError(staging.id!, 'no active type mapping for record');

        return Promise.resolve(Result.Success(true));
    }

    // we must fetch the file records for these data staging records, so that once they're processed we can attach
    // the files to the resulting nodes/edges - this is not a failure state if we can't fetch them - log and move on
    const stagingFiles = await FileMapper.Instance.ListForDataStagingRaw(staging.id!);
    if (stagingFiles.isError) {
        Logger.error(`unable to fetch files for data staging records ${stagingFiles.error?.error}`);
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
            const results = await transformation.applyTransformation(staging);
            if (results.isError) {
                await stagingMapper.rollbackTransaction(transaction.value);
                await stagingRepo.addError(staging.id!, `unable to apply transformation ${transformation.id} to data: ${results.error}`);

                return new Promise((resolve) => resolve(Result.SilentFailure(`unable to apply transformation ${transformation.id} to data: ${results.error}`)));
            }

            // check to see result type, force into corresponding container
            if (IsNodes(results.value)) nodesToInsert.push(...results.value);
            if (IsEdges(results.value)) edgesToInsert.push(...results.value);
        }

    // insert all nodes and files
    if (nodesToInsert.length > 0) {
        const inserted = await nodeRepository.bulkSave(staging.data_source_id!, nodesToInsert, transaction.value);
        if (inserted.isError) {
            await stagingMapper.rollbackTransaction(transaction.value);

            await stagingRepo.addError(staging.id!, `error attempting to insert nodes ${inserted.error?.error}`);
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

            const attached = await NodeMapper.Instance.BulkAddFile(nodeFiles, transaction.value);
            if (attached.isError) {
                await stagingRepo.addError(staging.id!, `unable to attach files to nodes during data staging process ${attached.error?.error}`);
            }
        }
    }

    // insert all edges and files
    if (edgesToInsert.length > 0) {
        const inserted = await edgeRepository.bulkSave(staging.data_source_id!, edgesToInsert, transaction.value);
        if (inserted.isError) {
            await stagingMapper.rollbackTransaction(transaction.value);

            await stagingRepo.addError(staging.id!, `error attempting to insert edges ${inserted.error?.error}`);
            return new Promise((resolve) => resolve(Result.SilentFailure(`error attempting to insert edges ${inserted.error?.error}`)));
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

            const attached = await EdgeMapper.Instance.BulkAddFile(edgeFiles, transaction.value);
            if (attached.isError) {
                await stagingRepo.addError(staging.id!, `unable to attach files to edges during data staging process ${attached.error?.error}`);
            }
        }
    }

    const marked = await stagingRepo.setInserted(staging, transaction.value);
    if (marked.isError) {
        await stagingMapper.rollbackTransaction(transaction.value);

        // update the individual data row which failed
        await stagingRepo.addError(staging.id!, `error attempting to mark data inserted ${marked.error}`);
        return new Promise((resolve) => resolve(Result.SilentFailure(`error attempting to mark data inserted ${marked.error}`)));
    }

    await stagingMapper.completeTransaction(transaction.value);
    return Promise.resolve(Result.Success(true));
}
