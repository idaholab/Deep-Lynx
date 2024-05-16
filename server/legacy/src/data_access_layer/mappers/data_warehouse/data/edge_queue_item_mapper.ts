import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import { PoolClient, QueryConfig } from 'pg';
import { EdgeQueueItem } from '../../../../domain_objects/data_warehouse/data/edge';
import config from '../../../../services/config';

const format = require('pg-format');

/*
    ContainerAlertMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class EdgeQueueItemMapper extends Mapper {
    public resultClass = EdgeQueueItem;
    public static tableName = 'edge_queue_items';

    private static instance: EdgeQueueItemMapper;

    public static get Instance(): EdgeQueueItemMapper {
        if (!EdgeQueueItemMapper.instance) {
            EdgeQueueItemMapper.instance = new EdgeQueueItemMapper();
        }

        return EdgeQueueItemMapper.instance;
    }

    public async Create(e: EdgeQueueItem, transaction?: PoolClient): Promise<Result<EdgeQueueItem>> {
        const r = await super.run(this.createStatement(e), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(e: EdgeQueueItem[] | EdgeQueueItem, transaction?: PoolClient): Promise<Result<EdgeQueueItem[]>> {
        if (!Array.isArray(e)) e = [e];

        return super.run(this.createStatement(...e), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async SetNextAttemptAt(id: string, nextRunDate: Date | string, error?: string): Promise<Result<boolean>> {
        return super.runStatement(this.setNextRunAtStatement(id, nextRunDate, error));
    }

    public async SetError(id: string, error: string): Promise<Result<boolean>> {
        return super.runStatement(this.setErrorStatement(id, error));
    }

    public async Delete(id: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id), { transaction });
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(...items: EdgeQueueItem[]): string {
        const text = `INSERT INTO edge_queue_items(
                       edge,
                       import_id,
                       tags
                       ) VALUES %L RETURNING *`;
        const values = items.map((item) => [item.edge, item.import_id, JSON.stringify(item.tags)]);

        return format(text, values);
    }

    private setNextRunAtStatement(id: string, nextAttemptDate: Date | string, error?: string): QueryConfig {
        if (error) {
            return {
                text: `UPDATE edge_queue_items SET next_attempt_at = $2, attempts = attempts + 1, error = $3 WHERE id = $1`,
                values: [id, nextAttemptDate, error],
            };
        } else {
            return {
                text: `UPDATE edge_queue_items SET next_attempt_at = $2, attempts = attempts + 1 WHERE id = $1`,
                values: [id, nextAttemptDate],
            };
        }
    }

    private setErrorStatement(id: string, error: string): QueryConfig {
        return {
            text: `UPDATE edge_queue_items SET error = $2 WHERE id = $1`,
            values: [id, error],
        };
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text: `DELETE FROM edge_queue_items WHERE id = $1`,
            values: [id],
        };
    }

    public needRetriedStreamingStatement(): string {
        // default to loading the latest first
        return `SElECT * FROM edge_queue_items 
         WHERE next_attempt_at < NOW() AT TIME ZONE 'utc' AND attempts <= ${config.edge_insertion_max_retries} 
         ORDER BY created_at DESC`;
    }
}
