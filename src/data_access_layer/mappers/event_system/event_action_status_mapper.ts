import Result from '../../../common_classes/result';
import EventActionStatus from '../../../domain_objects/event_system/event_action_status';
import Mapper from '../mapper';
import {PoolClient, QueryConfig} from 'pg';

const format = require('pg-format');

/*
    EventActionStatusMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class EventActionStatusMapper extends Mapper {
    public static tableName = 'event_action_statuses';

    private static instance: EventActionStatusMapper;

    public static get Instance(): EventActionStatusMapper {
        if (!EventActionStatusMapper.instance) {
            EventActionStatusMapper.instance = new EventActionStatusMapper();
        }

        return EventActionStatusMapper.instance;
    }

    public async Create(userID: string, input: EventActionStatus, transaction?: PoolClient): Promise<Result<EventActionStatus>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass: EventActionStatus,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Update(userID: string, input: EventActionStatus, transaction?: PoolClient): Promise<Result<EventActionStatus>> {
        const r = await super.run(this.fullUpdateStatement(userID, input), {
            transaction,
            resultClass: EventActionStatus,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Retrieve(id: string): Promise<Result<EventActionStatus>> {
        return super.retrieve(this.retrieveStatement(id), {
            resultClass: EventActionStatus,
        });
    }

    private createStatement(userID: string, ...statuses: EventActionStatus[]): string {
        const text = `INSERT INTO event_action_statuses(
                              event,
                              event_action_id,
                              status,
                              status_message) VALUES %L RETURNING *`;
        const values = statuses.map((s) => [s.event, s.event_action_id, s.status, s.status_message]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...statuses: EventActionStatus[]): string {
        const text = `UPDATE event_action_statuses as e SET
                              event = u.event::jsonb,
                              event_action_id = u.event_action_id::bigint,
                              status = u.status,
                              status_message = u.status_message,
                              modified_by = u.modified_by,
                              modified_at = NOW()
                          FROM (VALUES %L) AS u(id, event, event_action_id, status, status_message, modified_by)
                          WHERE u.id::bigint = e.id RETURNING e.*`;
        const values = statuses.map((s) => [s.id, s.event, s.event_action_id, s.status, s.status_message, userID]);

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM event_action_statuses WHERE id = $1`,
            values: [id],
        };
    }
}
