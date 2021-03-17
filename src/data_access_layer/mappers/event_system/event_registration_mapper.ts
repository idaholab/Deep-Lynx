import Result from "../../../result"
import EventRegistration from "../../../event_system/event_registration";
import Mapper from "../mapper";
import {PoolClient, QueryConfig} from "pg";
import uuid from "uuid";
import {plainToClass} from "class-transformer";
const format = require('pg-format')

/*
* EventRegistrationMapper interacts with registered events in the database to
* handle events registered by other applications
*/
export default class EventRegistrationMapper extends Mapper{
    public static tableName = "registered_events";

    private static instance: EventRegistrationMapper;

    public static get Instance(): EventRegistrationMapper {
        if(!EventRegistrationMapper.instance) {
            EventRegistrationMapper.instance = new EventRegistrationMapper()
        }

        return EventRegistrationMapper.instance
    }

    public async Create(userID:string, input: EventRegistration, transaction?: PoolClient): Promise<Result<EventRegistration>> {
        const r = await super.runRaw(this.createStatement(userID, input), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        const results = plainToClass(EventRegistration, r.value)
        return Promise.resolve(Result.Success(results[0]))
    }

    public async Update(userID:string, input: EventRegistration, transaction?: PoolClient): Promise<Result<EventRegistration>> {
        const r = await super.runRaw(this.fullUpdateStatement(userID, input), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        const results = plainToClass(EventRegistration, r.value)
        return Promise.resolve(Result.Success(results[0]))
    }

    public async Retrieve(id: string): Promise<Result<EventRegistration>> {
        const r = await super.retrieveRaw(this.retrieveStatement(id))
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(EventRegistration, r.value)))
    }

    public async List(): Promise<Result<EventRegistration[]>> {
        const r = await super.rowsRaw(this.listStatement())
        return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(EventRegistration, r.value)))
    }

    public async ListByDataSource(eventType: string, dataSourceID: string): Promise<Result<EventRegistration[]>> {
        const r = await super.rowsRaw(this.datasourceSearchStatement(dataSourceID, eventType))
        return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(EventRegistration, r.value)))
    }

    public async ListByContainer(eventType: string, containerID: string): Promise<Result<EventRegistration[]>> {
        const r = await super.rowsRaw(this.containerSearchStatement(containerID, eventType))
        return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(EventRegistration, r.value)))
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(this.deleteStatement(id))
    }

    public SetActive(id: string, userID: string): Promise<Result<boolean>> {
        return super.run(this.setActiveStatement(id, userID))
    }

    public SetInActive(id: string, userID: string): Promise<Result<boolean>> {
        return super.run(this.setInactiveStatement(id, userID))
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
                              modified_by) VALUES %L RETURNING *`
        const values = registrations.map(reg => [
            uuid.v4(),
            reg.app_name,
            reg.app_url,
            reg.data_source_id,
            reg.container_id,
            reg.event_type,
            userID, userID])

        return format(text, values)
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
                          WHERE u.id::uuid = r.id RETURNING r.*`
        const values = registrations.map(reg => [
            reg.id,
            reg.app_name,
            reg.app_url,
            reg.data_source_id,
            reg.container_id,
            reg.event_type,
            userID])

        return format(text, values)
    }

    private retrieveStatement(id:string): QueryConfig {
        return {
            text:`SELECT * FROM registered_events WHERE id = $1`,
            values: [id]
        }
    }

    private setInactiveStatement(id: string, userID: string): QueryConfig {
        return {
            text:`UPDATE registered_events SET active = false, modified_by = $2 WHERE id = $1`,
            values: [id, userID]
        }
    }

    private setActiveStatement(id: string, userID: string): QueryConfig {
        return {
            text:`UPDATE registered_events SET active = true, modified_by = $2 WHERE id = $1`,
            values: [id, userID]
        }
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text:`DELETE FROM registered_events WHERE id = $1`,
            values: [id]
        }
    }

    private listStatement(): QueryConfig {
        return {
            text: `SELECT * FROM registered_events`,
            values: []
        }
    }

    private datasourceSearchStatement(dataSourceID: string, eventType: string): QueryConfig {
        return {
            text: `SELECT * FROM registered_events WHERE data_source_id = $1 AND event_type = $2 AND active`,
            values: [dataSourceID, eventType],
        }
    }

    private containerSearchStatement(containerID: string, eventType: string): QueryConfig {
        return {
            text: `SELECT * FROM registered_events WHERE container_id = $1 AND event_type = $2 AND active`,
            values: [containerID, eventType],
        }
    }

}
