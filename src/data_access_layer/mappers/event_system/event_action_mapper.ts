import Result from '../../../common_classes/result';
import EventAction from '../../../domain_objects/event_system/event_action';
import Mapper from '../mapper';
import {PoolClient, QueryConfig} from 'pg';

const format = require('pg-format');

/*
    EventActionMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class EventActionMapper extends Mapper {
    public static tableName = 'event_actions';

    private static instance: EventActionMapper;

    public static get Instance(): EventActionMapper {
        if (!EventActionMapper.instance) {
            EventActionMapper.instance = new EventActionMapper();
        }

        return EventActionMapper.instance;
    }

    public async Create(userID: string, input: EventAction, transaction?: PoolClient): Promise<Result<EventAction>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass: EventAction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Update(userID: string, input: EventAction, transaction?: PoolClient): Promise<Result<EventAction>> {
        const r = await super.run(this.fullUpdateStatement(userID, input), {
            transaction,
            resultClass: EventAction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Retrieve(id: string): Promise<Result<EventAction>> {
        return super.retrieve(this.retrieveStatement(id), {
            resultClass: EventAction,
        });
    }

    public Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    public SetActive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setActiveStatement(id, userID));
    }

    public SetInActive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setInactiveStatement(id, userID));
    }

    private createStatement(userID: string, ...actions: EventAction[]): string {
        const text = `INSERT INTO event_actions(
                              container_id,
                              data_source_id,
                              event_type,
                              action_type,
                              action_config,
                              destination,
                              destination_data_source_id,
                              active,
                              created_by,
                              modified_by) VALUES %L RETURNING *`;
        const values = actions.map((a) => [
            a.container_id,
            a.data_source_id,
            a.event_type,
            a.action_type,
            a.action_config,
            a.destination,
            a.destination_data_source_id,
            a.active,
            userID,
            userID]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...actions: EventAction[]): string {
        const text = `UPDATE event_actions as e SET
                              container_id = u.container_id::bigint,
                              data_source_id = u.data_source_id::bigint,
                              event_type = u.event_type,
                              action_type = u.action_type,
                              action_config = u.action_config::jsonb,
                              destination = u.destination,
                              destination_data_source_id = u.destination_data_source_id::bigint,
                              active = u.active::boolean,
                              modified_by = u.modified_by,
                              modified_at = NOW()
                          FROM (VALUES %L) AS u(
                              id,
                              container_id,
                              data_source_id,
                              event_type,
                              action_type,
                              action_config,
                              destination,
                              destination_data_source_id,
                              active,
                              modified_by)
                          WHERE u.id::bigint = e.id RETURNING e.*`;
        const values = actions.map((a) => [
            a.id,
            a.container_id,
            a.data_source_id,
            a.event_type,
            a.action_type,
            a.action_config,
            a.destination,
            a.destination_data_source_id,
            a.active,
            userID]);

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM event_actions WHERE id = $1`,
            values: [id],
        };
    }

    private setInactiveStatement(id: string, userID: string): QueryConfig {
        return {
            text: `UPDATE event_actions SET active = false, modified_by = $2 WHERE id = $1`,
            values: [id, userID],
        };
    }

    private setActiveStatement(id: string, userID: string): QueryConfig {
        return {
            text: `UPDATE event_actions SET active = true, modified_by = $2 WHERE id = $1`,
            values: [id, userID],
        };
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text: `UPDATE event_actions SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
            values: [id],
        };
    }
}
