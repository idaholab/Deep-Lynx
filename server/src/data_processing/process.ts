import {DataStaging} from '../domain_objects/data_warehouse/import/import';
import TypeMappingRepository from '../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import TypeMapping from '../domain_objects/data_warehouse/etl/type_mapping';
import {ReturnSuperUser} from '../domain_objects/access_management/user';
import Logger from '../services/logger';
import Node, {IsNodes} from '../domain_objects/data_warehouse/data/node';
import Edge, {IsEdges} from '../domain_objects/data_warehouse/data/edge';
import DataStagingRepository from '../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import EdgeRepository from '../data_access_layer/repositories/data_warehouse/data/edge_repository';
import {SnapshotGenerator} from 'deeplynx';

export async function GenerateNodes(...staging: DataStaging[]): Promise<Node[]> {
    const stagingRepo = new DataStagingRepository();
    const mappingRepo = new TypeMappingRepository();
    const updated: DataStaging[] = [];
    let nodeHashUpdate = false;
    const records = staging.map((s) => {
        if (!s.shape_hash) {
            const shapeHash = TypeMapping.objectToShapeHash(s.data, {
                value_nodes: s.data_source_config?.value_nodes,
                stop_nodes: s.data_source_config?.stop_nodes,
            });
            s.shape_hash = shapeHash;

            updated.push(s);
            nodeHashUpdate = true;
        }
        return s;
    });
   
    if (nodeHashUpdate) await stagingRepo.bulkSave(updated);

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
        .list(true);

    const nodesToInsert: Node[] = []; // holds all nodes to insert

    for (const record of records) {
        const errors = await record.validationErrors();
        if (errors) {
            await stagingRepo.addError(record.id!, `data does not pass validation for processing: ${JSON.stringify(errors)}`);
            continue;
        }
        // pull the mappings out
        let mappings = all_mappings.value.filter((m) => m.data_source_id === record.data_source_id && (m.shape_hash === record.shape_hash));
       

        mappings = mappings.filter((m) => m.active);
        if (mappings.length === 0) {
            await stagingRepo.setErrors(record.id!, ['no active type mapping for record']);
            continue;
        }

        // for each transformation run the transformation process. Results will either be an array of nodes or an array of edges
        // if we run into errors, add the error to the data staging row, and immediately return. Do not attempt to
        // run any more transformations
        for (const mapping of mappings) {
            if (mapping.transformations) {
                if (mapping.transformations.length === 0) {
                    await stagingRepo.addError(record.id!, `no active type transformation for associated mapping`);
                }

                // we're only doing node transformations here
                for (const transformation of mapping.transformations.filter((t) => t.type === 'node')) {
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
                    }
                }
            }
        }
    }
    // we used to have a deduplication step here, that's now handled by the move from temp to full table
    return Promise.resolve(nodesToInsert);
}

export async function GenerateEdges(snapshot: SnapshotGenerator, ...staging: DataStaging[]): Promise<Edge[]> {
    const stagingRepo = new DataStagingRepository();
    const mappingRepo = new TypeMappingRepository();

    const updated: DataStaging[] = [];
    let edgeHashUpdate = false;
    const records = staging.map((s) => {
        if (!s.shape_hash) {
            const shapeHash = TypeMapping.objectToShapeHash(s.data, {
                value_nodes: s.data_source_config?.value_nodes,
                stop_nodes: s.data_source_config?.stop_nodes,
            });
            s.shape_hash = shapeHash;

            updated.push(s);
            edgeHashUpdate = true;
        }

        return s;
    });
    // update the staging records with the shape-hash if needed
    if (edgeHashUpdate) await stagingRepo.bulkSave(updated);

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
        .list(true, undefined);

    const rawEdges: Edge[] = [];

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
            if (mapping.transformations) {
                if (mapping.transformations.length === 0) {
                    await stagingRepo.addError(record.id!, `no active type transformation for associated mapping`);
                }

                for (const transformation of mapping.transformations.filter((t) => t.type === 'edge')) {
                    // skip if the transformation is archived
                    if (transformation.archived) continue;

                    // keep in mind that any conversion errors that didn't cause the complete failure of the transformation
                    // will be contained in the metadata object on the transformed object
                    const results = await transformation.applyTransformation(record);
                    if (results.isError) {
                        await stagingRepo.setErrors(record.id!, [`unable to apply transformation ${transformation.id} to data: ${results.error?.error}`]);
                        continue;
                    }

                    if (IsEdges(results.value)) rawEdges.push(...results.value);
                }
            }
        }
    }

    const finishedEdges: Edge[] = [];
    for (const rawEdge of rawEdges) {
        const edges = await new EdgeRepository().populateFromParameters(rawEdge, snapshot);
        if (edges.isError) {
            Logger.error(`unable to create edges from parameters: ${edges.error?.error}`);
            continue;
        }
        finishedEdges.push(...edges.value);
    }

    return Promise.resolve(finishedEdges);
}
