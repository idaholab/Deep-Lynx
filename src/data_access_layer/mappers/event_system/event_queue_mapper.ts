import Result from "../../../result"
import Mapper from "../mapper";
import {QueryConfig} from "pg";
import Task from "../../../event_system/task";
import {plainToClass} from "class-transformer";

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
        const task = await super.retrieveRaw(EventQueueMapper.retrieveStatement(id))
        if(task.isError) return Promise.resolve(Result.Pass(task))

        // TODO verify it's setting the right values on the included event task
        return Promise.resolve(Result.Success(plainToClass(Task, task.value)))
    }

    public async List(): Promise<Task[]> {
        const rows = await super.rowsRaw(EventQueueMapper.listStatement())
        if(rows.isError) return Promise.resolve([])

        return Promise.resolve(plainToClass(Task, rows.value))
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(EventQueueMapper.deleteStatement(id))
    }

    private static retrieveStatement(id:string): QueryConfig {
        return {
            text:`SELECT * FROM ${this.tableName} WHERE id = $1`,
            values: [id]
        }
    }

    private static deleteStatement(id: string): QueryConfig {
        return {
            text:`DELETE FROM ${this.tableName} WHERE id = $1`,
            values: [id]
        }
    }

    private static listStatement(): QueryConfig {
        return {
            text: `SELECT * FROM ${this.tableName}`,
            values: []
        }
    }

}
