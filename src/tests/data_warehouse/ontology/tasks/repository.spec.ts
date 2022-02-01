import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import {expect} from 'chai';
import faker from 'faker';
import Logger from '../../../../services/logger';
import TaskMapper from '../../../../data_access_layer/mappers/task_runner/task_mapper';
import TaskRecord, {HpcTaskConfig} from '../../../../domain_objects/task_runner/task';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import {User} from '../../../../domain_objects/access_management/user';
import TaskRepository from '../../../../data_access_layer/repositories/task_runner/task_repository';

describe('A Task Repository', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let task: TaskRecord;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping task tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();

        const mapper = ContainerStorage.Instance;

        const container = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(container.isError).false;
        expect(container.value.id).not.null;
        containerID = container.value.id!;

        const userResult = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser'],
            }),
        );

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value;

        // we're going to build at least one task from scratch before
        // so that tests can use this instead of building their own if they can
        const exp = await TaskMapper.Instance.Create(
            user.id!,
            new TaskRecord({
                container_id: containerID,
                task_type: 'hpc',
                query: 'Sample GraphQL query',
                config: new HpcTaskConfig({user}),
            }),
        );

        expect(exp.isError).false;
        task = exp.value;

        return Promise.resolve();
    });

    it('can save, list, and find by ID', async () => {
        const repo = new TaskRepository();

        const newTask = await repo.save(task, user);

        expect(newTask.isError).false;
        expect(newTask.value).true;

        const taskById = await repo.findByID(task.id!);

        expect(taskById.isError).false;
        expect(taskById.value.id).not.null;

        const listTasks = await repo.list();

        expect(listTasks.isError).false;
        expect(listTasks.value.length).greaterThan(0);

        return await repo.delete(task);
    });
});
