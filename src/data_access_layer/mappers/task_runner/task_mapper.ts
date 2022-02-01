import {PoolClient, QueryConfig} from 'pg';
import Result from '../../../common_classes/result';
import TaskRecord from '../../../domain_objects/task_runner/task';
import Mapper from '../mapper';

const format = require('pg-format');
const resultClass = TaskRecord;

export default class TaskMapper extends Mapper {
    public static tableName = 'tasks';

    private static instance: TaskMapper;

    public static get Instance(): TaskMapper {
        if (!TaskMapper.instance) {
            TaskMapper.instance = new TaskMapper();
        }

        return TaskMapper.instance;
    }

    public async Create(userID: string, input: TaskRecord, transaction?: PoolClient): Promise<Result<TaskRecord>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Update(userID: string, input: TaskRecord, transaction?: PoolClient): Promise<Result<TaskRecord>> {
        const r = await super.run(this.fullUpdateStatement(userID, input), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public Retrieve(id: string): Promise<Result<TaskRecord>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass});
    }

    public async List(): Promise<Result<TaskRecord[]>> {
        return super.rows(this.listStatement(), {resultClass});
    }

    public Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    private createStatement(userID: string, ...tasks: TaskRecord[]): string {
        const text = `INSERT INTO tasks(
            container_id,
            task_type,
            status,
            status_message,
            query,
            data,
            config,
            created_by,
            modified_by) VALUES %L RETURNING *`;
        const values = tasks.map((task) => [
            task.container_id,
            task.task_type,
            task.status,
            task.status_message,
            task.query,
            task.data,
            task.config,
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...tasks: TaskRecord[]): string {
        const text = `UPDATE tasks AS t SET
                         status = u.status,
                         status_message = u.status_message,
                         config = u.config::jsonb,
                         modified_by = u.modified_by,
                         modified_at = NOW()
                      FROM(VALUES %L) as u(
                          id,
                          status,
                          status_message,
                          config,
                          modified_by)
                      WHERE u.id::bigint = t.id RETURNING t.*`;
        const values = tasks.map((task) => [task.id, task.status, task.status_message, task.config, userID]);

        return format(text, values);
    }

    private retrieveStatement(taskID: string): QueryConfig {
        return {
            text: `SELECT * FROM tasks WHERE id = $1`,
            values: [taskID],
        };
    }

    private listStatement(): QueryConfig {
        return {
            text: `SELECT t.* FROM tasks t`,
        };
    }

    private deleteStatement(taskID: string): QueryConfig {
        return {
            text: `DELETE FROM tasks WHERE id = $1`,
            values: [taskID],
        };
    }
}
