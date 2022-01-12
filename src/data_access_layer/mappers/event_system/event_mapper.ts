import Result from '../../../common_classes/result';
import Event from '../../../domain_objects/event_system/event';
import Mapper from '../mapper';
import {PoolClient, QueryConfig} from 'pg';
import {v4 as uuidv4} from 'uuid';

const format = require('pg-format');

/*
    EventMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class EventMapper extends Mapper {
    public static tableName = 'events';

    private static instance: EventMapper;

    public static get Instance(): EventMapper {
        if (!EventMapper.instance) {
            EventMapper.instance = new EventMapper();
        }

        return EventMapper.instance;
    }

    public async Create(userID: string, input: Event, transaction?: PoolClient): Promise<Result<Event>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass: Event,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async SetProcessed(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.setProcessedStatement(id));
    }

    public async Retrieve(id: string): Promise<Result<Event>> {
        return super.retrieve(this.retrieveStatement(id), {
            resultClass: Event,
        });
    }

    public Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    private createStatement(userID: string, ...events: Event[]): string {
        const text = `INSERT INTO events(
                              id,
                              container_id,
                              data_source_id,
                              event_type,
                              event_config,
                              event,
                              created_by) VALUES %L RETURNING *`;
        const values = events.map((event) => [
            uuidv4(),
            event.container_id,
            event.data_source_id,
            event.event_type,
            event.event_config,
            event.event,
            userID]);

        return format(text, values);
    }

    private setProcessedStatement(id: string): QueryConfig {
        return {
            text: `UPDATE events SET processed = NOW() WHERE id = $1`,
            values: [id],
        }
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM events WHERE id = $1`,
            values: [id],
        };
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text: `DELETE FROM events WHERE id = $1`,
            values: [id],
        };
    }
}
