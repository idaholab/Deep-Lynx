import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import ImportMapper from '../../../../data_access_layer/mappers/data_warehouse/import/import_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import {User} from '../../../../domain_objects/access_management/user';
import Import from '../../../../domain_objects/data_warehouse/import/import';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import EdgeQueueItemMapper from '../../../../data_access_layer/mappers/data_warehouse/data/edge_queue_item_mapper';
import Edge, {EdgeQueueItem} from '../../../../domain_objects/data_warehouse/data/edge';

describe('A edge queue item mapper', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let importID: string;
    let user: User;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
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

        const storage = DataSourceMapper.Instance;
        const importStorage = ImportMapper.Instance;

        const exp = await storage.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: true,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const newImport = await importStorage.CreateImport(
            'test suite',
            new Import({
                data_source_id: exp.value.id!,
                reference: 'testing upload',
            }),
        );
        expect(newImport.isError).false;
        importID = newImport.value.id!;

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        return ContainerMapper.Instance.Delete(containerID);
    });

    it('can save an edge queue item to the database', async () => {
        const storage = EdgeQueueItemMapper.Instance;

        const item = new EdgeQueueItem({
            edge: {} as Edge,
            import_id: importID,
            next_attempt_at: new Date(),
        });

        const result = await storage.Create(item);
        expect(result.isError).false;

        return storage.Delete(result.value.id!);
    });

    it('can set next attempted date', async () => {
        const storage = EdgeQueueItemMapper.Instance;

        const item = new EdgeQueueItem({
            edge: {} as Edge,
            import_id: importID,
            next_attempt_at: new Date(),
        });

        const result = await storage.Create(item);
        expect(result.isError).false;

        let nextAttempt = new Date();
        nextAttempt.setHours(nextAttempt.getHours() + 2);

        const setResult = await storage.SetNextAttemptAt(result.value.id!, nextAttempt);
        expect(setResult.isError).false;

        return storage.Delete(result.value.id!);
    });

    it('can set error', async () => {
        const storage = EdgeQueueItemMapper.Instance;

        const item = new EdgeQueueItem({
            edge: {} as Edge,
            import_id: importID,
            next_attempt_at: new Date(),
        });

        const result = await storage.Create(item);
        expect(result.isError).false;

        const setResult = await storage.SetError(result.value.id!, 'test error');
        expect(setResult.isError).false;

        return storage.Delete(result.value.id!);
    });
});
