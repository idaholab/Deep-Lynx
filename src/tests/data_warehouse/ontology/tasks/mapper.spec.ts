import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import {expect} from 'chai';
import faker from 'faker';
import Logger from '../../../../services/logger';
import TaskMapper from '../../../../data_access_layer/mappers/task_runner/task_mapper';
import TaskRecord from '../../../../domain_objects/task_runner/task';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';

describe('A Task Mapper', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';

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

        return Promise.resolve();
    });

    it('can save to storage', async () => {
        const mapper = TaskMapper.Instance;

        const task = await mapper.Create(
            'test suite',
            new TaskRecord({
                container_id: containerID,
                task_type: 'hpc',
                query: 'Sample GraphQL query',
            }),
        );

        expect(task.isError).false;
        expect(task.value.id).not.null;

        return await mapper.Delete(task.value.id!);
    });

    it('can be updated in storage', async () => {
        const mapper = TaskMapper.Instance;

        const task = await mapper.Create(
            'test suite',
            new TaskRecord({
                container_id: containerID,
                task_type: 'hpc',
                query: 'Sample GraphQL query',
            }),
        );

        expect(task.isError).false;
        expect(task.value.id).not.null;

        const retrieved = await mapper.Retrieve(task.value.id!);
        expect(retrieved.isError).false;

        const listed = await mapper.List();
        expect(listed.isError).false;
        expect(listed.value.length).greaterThan(0);

        task.value.status = 'completed';
        task.value.status_message = 'test task complete';

        const updateResult = await mapper.Update('test-suite', task.value);
        expect(updateResult.isError).false;
        expect(updateResult.value.status).eq('completed');

        return await mapper.Delete(task.value.id!);
    });
});
