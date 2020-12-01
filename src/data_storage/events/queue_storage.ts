import {TaskT, TasksT} from "../../types/events/taskT";
import Result from "../../result"
import PostgresStorage from "../postgresStorage";
import {QueryConfig} from "pg";
import Logger from "../../logger";
import Config from "../../config"

/*
* QueueStorage interacts with tasks in the database queue
*/
export default class QueueStorage extends PostgresStorage{
    public static tableName = Config.queue_table_name;

    private static instance: QueueStorage;

    public static get Instance(): QueueStorage {
        if(!QueueStorage.instance) {
          QueueStorage.instance = new QueueStorage()
        }

        return QueueStorage.instance
    }


    public async Retrieve(id: string): Promise<Result<TaskT>> {
        const task = await super.retrieve<TaskT>(QueueStorage.retrieveStatement(id))
        task.value.task = JSON.parse(`${task.value.task}`)
        return task
    }

    public async List(): Promise<TaskT[]> {
        const rows = await super.rows<TaskT>(QueueStorage.listStatement())
        return rows.value.map(x => {
            const rTask: TaskT = x
            rTask.task = JSON.parse(`${x.task}`)
            return rTask
        })
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(QueueStorage.deleteStatement(id))
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
