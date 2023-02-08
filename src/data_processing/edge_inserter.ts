import Edge, {EdgeQueueItem} from '../domain_objects/data_warehouse/data/edge';
import Result from '../common_classes/result';
import EdgeRepository from '../data_access_layer/repositories/data_warehouse/data/edge_repository';
import EdgeMapper from '../data_access_layer/mappers/data_warehouse/data/edge_mapper';
import Config from '../services/config';
import Logger from '../services/logger';
import EdgeQueueItemMapper from '../data_access_layer/mappers/data_warehouse/data/edge_queue_item_mapper';
import FileMapper from '../data_access_layer/mappers/data_warehouse/data/file_mapper';
import {DataStagingFile, EdgeFile} from '../domain_objects/data_warehouse/data/file';
import {plainToClass} from 'class-transformer';

// InsertEdge takes a single EdgeQueueItem and attempts to insert it into the database without making any changes
export async function InsertEdge(edgeQueueItem: EdgeQueueItem): Promise<Result<boolean>> {
    const mapper = EdgeMapper.Instance;
    const queueMapper = EdgeQueueItemMapper.Instance;
    const repo = new EdgeRepository();

    const edge = plainToClass(Edge, edgeQueueItem.edge);

    // run the filters if needed
    const edges = await repo.populateFromParameters(edge);
    if (edges.isError) {
        Logger.error(`unable to create edges from parameters: ${edges.error?.error}`);

        // if we failed, need to iterate the attempts and set the next attempt date, so we don't swamp the database - this
        // is an exponential backoff
        const currentTime = new Date().getTime();
        const check = currentTime + Math.pow(Config.edge_insertion_backoff_multiplier, edgeQueueItem.attempts++) * 1000;

        edgeQueueItem.next_attempt_at = new Date(check);

        const set = await queueMapper.SetNextAttemptAt(edgeQueueItem.id!, edgeQueueItem.next_attempt_at.toISOString(), edges.error?.error);
        if (set.isError) {
            Logger.error(`unable to set next retry time for edge queue item ${set.error?.error}`);
        }

        return Promise.resolve(Result.Failure(`unable to populate edges from parameter ${edges.error?.error}`));
    }

    Logger.debug(`created ${edges.value.length} from edge parameters`);
    // we need to do batch insert here
    let recordBuffer: Edge[] = [];
    const saveOperations: Promise<Result<boolean>>[] = [];

    edges.value.forEach((e) => {
        recordBuffer.push(e);

        if (recordBuffer.length >= Config.data_source_batch_size) {
            const toSave = [...recordBuffer];
            recordBuffer = [];

            saveOperations.push(repo.bulkSave(edge.created_by!, toSave));
        }
    });

    saveOperations.push(repo.bulkSave(edge.created_by!, recordBuffer));

    Logger.debug(`saving ${saveOperations.length} edges`);
    const saveResults = await Promise.all(saveOperations);
    if (saveResults.filter((result) => result.isError || !result.value).length > 0) {
        const error = saveResults.filter((result) => result.isError).map((result) => JSON.stringify(result.error));
        Logger.error(`unable to save edges: ${error}`);

        // if we failed, need to iterate the attempts and set the next attempt date, so we don't swamp the database - this
        // is an exponential backoff
        const currentTime = new Date().getTime();
        const check = currentTime + Math.pow(Config.edge_insertion_backoff_multiplier, edgeQueueItem.attempts++) * 1000;

        edgeQueueItem.next_attempt_at = new Date(check);

        const set = await queueMapper.SetNextAttemptAt(edgeQueueItem.id!, edgeQueueItem.next_attempt_at.toISOString(), error.join(','));
        if (set.isError) {
            Logger.debug(`unable to set next retry time for edge queue item ${set.error?.error}`);
        }

        return Promise.resolve(Result.Failure(`unable to save edges ${error}`));
    }

    // now we attach the files

    if (edgeQueueItem.file_attached) {
        const stagingFiles = await FileMapper.Instance.ListForDataStagingRaw(edge.data_staging_id!);
        if (stagingFiles.isError) {
            Logger.error(`unable to fetch files for data staging records ${stagingFiles.error?.error}`);
        }

        if (!stagingFiles.isError) {
            const edgeFiles: EdgeFile[] = [];

            stagingFiles.value.forEach((file) => {
                edges.value.forEach((e) => {
                    edgeFiles.push(
                        new EdgeFile({
                            edge_id: e.id!,
                            file_id: file.file_id!,
                        }),
                    );
                });
            });

            if (edgeFiles.length > 0) {
                const attached = await mapper.BulkAddFile(edgeFiles);
                if (attached.isError) {
                    Logger.error(`unable to attach files to edge ${attached.error?.error}`);
                }
            }
        } else {
            Logger.error(`unable to list files for potential edge ${stagingFiles.error?.error}`);
        }
    }

    // if the original edge item is one with filters, we continually put it back on the queue until it either hits the limit
    // or the backoff time in order to capture all potential nodes that match this filter from earlier or later imports
    if ((edge.origin_parameters && edge.origin_parameters.length > 0) || (edge.destination_parameters && edge.destination_parameters.length > 0)) {
        const currentTime = new Date().getTime();
        const check = currentTime + Math.pow(Config.edge_insertion_backoff_multiplier, edgeQueueItem.attempts++) * 1000;

        edgeQueueItem.next_attempt_at = new Date(check);

        const set = await queueMapper.SetNextAttemptAt(edgeQueueItem.id!, edgeQueueItem.next_attempt_at.toISOString(), 'edge with filters, staying in queue');
        if (set.isError) {
            Logger.debug(`unable to set next retry time for edge queue item ${set.error?.error}`);
        }
    } else {
        // if the original edge has no filters, then delete the queue item and mark as complete
        const deleted = await queueMapper.Delete(edgeQueueItem.id!);
        if (deleted.isError) {
            Logger.debug(`unable to delete edge queue item: ${deleted.error?.error}`);

            return Promise.resolve(Result.Failure(`unable to delete edge queue item ${deleted.error?.error}`));
        }
    }

    return Promise.resolve(Result.Success(true));
}
