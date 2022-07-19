/*
    EdgeQueueItem repository is used to count and list items in the edge processing queue
    It only extends the base repository, it does not implement the repository interface
 */
import {QueryOptions, Repository} from '../../repository';
import {PoolClient} from 'pg';
import Result from '../../../../common_classes/result';
import EdgeQueueItemMapper from '../../../mappers/data_warehouse/data/edge_queue_item_mapper';
import {EdgeQueueItem} from '../../../../domain_objects/data_warehouse/data/edge';

export default class EdgeQueueItemRepository extends Repository {
    constructor() {
        super(EdgeQueueItemMapper.tableName);
    }

    importID(operator: string, value: string) {
        super.query('import_id', operator, value);
        return this;
    }

    nextAttemptAt(operator: string, value: string) {
        super.query('next_attempt_at', operator, value, 'date');
        return this;
    }

    count(transaction?: PoolClient, queryOptions?: QueryOptions): Promise<Result<number>> {
        return super.count(transaction, queryOptions);
    }

    list(queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<EdgeQueueItem[]>> {
        return super.findAll<EdgeQueueItem>(queryOptions, {transaction, resultClass: EdgeQueueItem});
    }
}
