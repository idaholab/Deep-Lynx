import Edge, {EdgeQueueItem} from '../domain_objects/data_warehouse/data/edge';
import Result from '../common_classes/result';
import EdgeRepository from '../data_access_layer/repositories/data_warehouse/data/edge_repository';
import EdgeMapper from '../data_access_layer/mappers/data_warehouse/data/edge_mapper';
import Cache from '../services/cache/cache';
import Config from '../services/config';
import Logger from '../services/logger';
import EdgeQueueItemMapper from '../data_access_layer/mappers/data_warehouse/data/edge_queue_item_mapper';
import FileMapper from '../data_access_layer/mappers/data_warehouse/data/file_mapper';
import {EdgeFile} from '../domain_objects/data_warehouse/data/file';
import {plainToClass} from 'class-transformer';

// InsertEdge takes a single EdgeQueueItem and attempts to insert it into the database without making any changes
export async function InsertEdge(edgeQueueItem: EdgeQueueItem): Promise<Result<boolean>> {
    const mapper = EdgeMapper.Instance;
    const queueMapper = EdgeQueueItemMapper.Instance;
    const repo = new EdgeRepository();

    const transaction = await mapper.startTransaction();
    const edge = plainToClass(Edge, edgeQueueItem.edge);

    // first thing we do is lower the ttl for this edge, indicating that we're currently processing it
    await Cache.set(`edge_insertion_${edgeQueueItem.id}`, {}, Config.import_cache_ttl);

    // run bulk save so we don't need a user type
    const inserted = await repo.bulkSave(edge.created_by!, [edge], transaction.value);
    if (inserted.isError) {
        await mapper.rollbackTransaction(transaction.value);
        Logger.debug(`unable to save edge: ${inserted.error?.error}`);

        // if we failed, need to iterate the attempts and set the next attempt date, so we don't swamp the database - this
        // is an exponential backoff
        const currentTime = new Date().getTime();
        const check = currentTime + Math.pow(Config.edge_insertion_backoff_multiplier, edgeQueueItem.attempts++) * 1000;

        edgeQueueItem.next_attempt_at = new Date(check);

        const set = await queueMapper.SetNextAttemptAt(edgeQueueItem.id!, edgeQueueItem.next_attempt_at.toISOString(), inserted.error?.error);
        if (set.isError) {
            Logger.debug(`unable to set next retry time for edge queue item ${set.error?.error}`);
        }

        await Cache.del(`edge_insertion_${edgeQueueItem.id}`);
        return Promise.resolve(Result.Failure(`unable to save edge ${inserted.error?.error}`));
    }

    // now we attach the files
    const stagingFiles = await FileMapper.Instance.ListForDataStagingRaw(edge.data_staging_id!);
    if (stagingFiles.isError) {
        Logger.error(`unable to fetch files for data staging records ${stagingFiles.error?.error}`);
    }

    if (!stagingFiles.isError) {
        const edgeFiles: EdgeFile[] = [];

        stagingFiles.value.forEach((file) => {
            edgeFiles.push(
                new EdgeFile({
                    edge_id: edge.id!,
                    file_id: file.file_id!,
                }),
            );
        });

        if (edgeFiles.length > 0) {
            const attached = await mapper.BulkAddFile(edgeFiles, transaction.value);
            if (attached.isError) {
                Logger.error(`unable to attach files to edge ${attached.error?.error}`);
            }
        }
    } else {
        Logger.error(`unable to list files for potential edge ${stagingFiles.error?.error}`);
    }

    const deleted = await queueMapper.Delete(edgeQueueItem.id!, transaction.value);
    if (deleted.isError) {
        await mapper.rollbackTransaction(transaction.value);
        Logger.debug(`unable to delete edge queue item: ${deleted.error?.error}`);

        await Cache.del(`edge_insertion_${edgeQueueItem.id}`);
        return Promise.resolve(Result.Failure(`unable to delete edge queue item ${deleted.error?.error}`));
    }

    await mapper.completeTransaction(transaction.value);
    await Cache.del(`edge_insertion_${edgeQueueItem.id}`);
    return Promise.resolve(Result.Success(true));
}
