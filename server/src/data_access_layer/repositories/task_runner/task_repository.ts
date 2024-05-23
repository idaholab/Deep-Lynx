import {PoolClient} from 'pg';
import Result from '../../../common_classes/result';
import {User} from '../../../domain_objects/access_management/user';
import TaskRecord from '../../../domain_objects/task_runner/task';
import TaskMapper from '../../mappers/task_runner/task_mapper';
import RepositoryInterface, {QueryOptions, Repository} from '../repository';

export default class TaskRepository extends Repository implements RepositoryInterface<TaskRecord> {
    #mapper = TaskMapper.Instance;

    async findByID(id: string): Promise<Result<TaskRecord>> {
        const taskRecord = await this.#mapper.Retrieve(id);
        if (taskRecord.isError) return Promise.resolve(Result.Pass(taskRecord));

        return Promise.resolve(Result.Pass(taskRecord));
    }

    async save(t: TaskRecord, user: User): Promise<Result<boolean>> {
        const errors = await t.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`task record does not pass validation ${errors.join(',')}`));

        if (t.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(t.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, t);

            const updated = await this.#mapper.Update(user.id!, original.value);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            t = updated.value;
        } else {
            const created = await this.#mapper.Create(user.id!, t);
            if (created.isError) return Promise.resolve(Result.Pass(created));

            t = created.value;
        }

        return Promise.resolve(Result.Success(true));
    }

    async delete(t: TaskRecord): Promise<Result<boolean>> {
        if (!t.id) return Promise.resolve(Result.Failure(`cannot delete task: no id`));

        return this.#mapper.Delete(t.id);
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<(TaskRecord | undefined)[]>> {
        const results = await super.findAll<TaskRecord>(options, {
            transaction,
            resultClass: TaskRecord,
        });
        if (results.isError) return Promise.resolve(Result.Pass(results));

        return Promise.resolve(Result.Pass(results));
    }

    status(operator: string, value: string) {
        super.query('status', operator, value);
        return this;
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
        return this;
    }

    constructor() {
        super(TaskMapper.tableName);
    }
}
