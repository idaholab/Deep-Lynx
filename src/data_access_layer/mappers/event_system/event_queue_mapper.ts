import Result from "../../../common_classes/result"
import Mapper from "../mapper";
import {QueryConfig} from "pg";
import Task from "../../../event_system/task";
import {plainToClass} from "class-transformer";

const resultClass = Task

/*
    EventQueueMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class EventQueueMapper extends Mapper{
    public static tableName = "queue_tasks";

    private static instance: EventQueueMapper;

    public static get Instance(): EventQueueMapper {
        if(!EventQueueMapper.instance) {
          EventQueueMapper.instance = new EventQueueMapper()
        }

        return EventQueueMapper.instance
    }

    public async Retrieve(id: string): Promise<Result<Task>> {
        // TODO verify it's setting the right values on the included event task
        return super.retrieve<Task>(this.retrieveStatement(id), {resultClass})
    }

    public async List(): Promise<Task[]> {
        const rows = await super.rows<object>(this.listStatement())
        if(rows.isError) return Promise.resolve([])

        return Promise.resolve(plainToClass(Task, rows.value))
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id))
    }

    private retrieveStatement(id:string): QueryConfig {
        return {
            text:`SELECT * FROM ${EventQueueMapper.tableName} WHERE id = $1`,
            values: [id]
        }
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text:`DELETE FROM ${EventQueueMapper.tableName} WHERE id = $1`,
            values: [id]
        }
    }

    private listStatement(): QueryConfig {
        return {
            text: `SELECT * FROM ${EventQueueMapper.tableName}`,
            values: []
        }
    }

}
