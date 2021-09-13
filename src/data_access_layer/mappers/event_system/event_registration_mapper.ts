import Result from '../../../common_classes/result';
import EventRegistration from '../../../domain_objects/event_system/event_registration';
import Mapper from '../mapper';
import {PoolClient, QueryConfig} from 'pg';
import uuid from 'uuid';

const format = require('pg-format');

/*
    EventRegistrationMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class EventRegistrationMapper extends Mapper {
    public static tableName = 'registered_events';

    private static instance: EventRegistrationMapper;

    public static get Instance(): EventRegistrationMapper {
        if (!EventRegistrationMapper.instance) {
            EventRegistrationMapper.instance = new EventRegistrationMapper();
        }

        return EventRegistrationMapper.instance;
    }

    public async Create(userID: string, input: EventRegistration, transaction?: PoolClient): Promise<Result<EventRegistration>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass: EventRegistration,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Update(userID: string, input: EventRegistration, transaction?: PoolClient): Promise<Result<EventRegistration>> {
        const r = await super.run(this.fullUpdateStatement(userID, input), {
            transaction,
            resultClass: EventRegistration,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Retrieve(id: string): Promise<Result<EventRegistration>> {
        return super.retrieve(this.retrieveStatement(id), {
            resultClass: EventRegistration,
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

    private createStatement(userID: string, ...registrations: EventRegistration[]): string {
        const text = `INSERT INTO registered_events(
                              id,
                              app_name,
                              app_url,
                              data_source_id,
                              container_id,
                              event_type,
                              created_by,
                              modified_by) VALUES %L RETURNING *`;
        const values = registrations.map((reg) => [uuid.v4(), reg.app_name, reg.app_url, reg.data_source_id, reg.container_id, reg.event_type, userID, userID]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...registrations: EventRegistration[]): string {
        const text = `UPDATE registered_events as r SET
                              app_name = u.app_name,
                              app_url = u.app_url,
                              data_source_id = u.data_source_id::uuid,
                              container_id = u.container_id::uuid,
                              event_type = u.event_type,
                              modified_by = u.modified_by,
                              modified_at = NOW()
                          FROM (VALUES %L) AS u(id, app_name, app_url,data_source_id, container_id, event_type, modified_by)
                          WHERE u.id::uuid = r.id RETURNING r.*`;
        const values = registrations.map((reg) => [reg.id, reg.app_name, reg.app_url, reg.data_source_id, reg.container_id, reg.event_type, userID]);

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM registered_events WHERE id = $1`,
            values: [id],
        };
    }

    private setInactiveStatement(id: string, userID: string): QueryConfig {
        return {
            text: `UPDATE registered_events SET active = false, modified_by = $2 WHERE id = $1`,
            values: [id, userID],
        };
    }

    private setActiveStatement(id: string, userID: string): QueryConfig {
        return {
            text: `UPDATE registered_events SET active = true, modified_by = $2 WHERE id = $1`,
            values: [id, userID],
        };
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text: `DELETE FROM registered_events WHERE id = $1`,
            values: [id],
        };
    }
}
