import faker from 'faker';
import { expect } from 'chai';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../services/logger';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import ExportMapper from '../../../data_access_layer/mappers/data_warehouse/export/export_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import ExportRecord, { StandardExporterConfig } from '../../../domain_objects/data_warehouse/export/export';

describe('An Export', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';

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
                description: faker.random.alphaNumeric()
            })
        );

        expect(container.isError).false;
        expect(container.value.id).not.null;
        containerID = container.value.id!;

        return Promise.resolve();
    });

    after(async () => {
        return ContainerMapper.Instance.Delete(containerID);
    });

    it('can be saved to storage', async () => {
        const storage = ExportMapper.Instance;

        const exp = await storage.Create(
            'test suite',
            new ExportRecord({
                container_id: containerID,
                adapter: 'gremlin',
                config: new StandardExporterConfig()
            })
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        return storage.Delete(exp.value.id!);
    });

    it('can be retrieved from  storage', async () => {
        const storage = ExportMapper.Instance;

        const exp = await storage.Create(
            'test suite',
            new ExportRecord({
                container_id: containerID,
                adapter: 'gremlin',
                config: new StandardExporterConfig()
            })
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const retrieved = await storage.Retrieve(exp.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(exp.value.id);

        return storage.Delete(exp.value.id!);
    });

    it('can be have its status set', async () => {
        const storage = ExportMapper.Instance;

        const exp = await storage.Create(
            'test suite',
            new ExportRecord({
                container_id: containerID,
                adapter: 'gremlin',
                config: new StandardExporterConfig()
            })
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const set = await storage.SetStatus('test suite', exp.value.id!, 'processing');
        expect(set.isError).false;

        return storage.Delete(exp.value.id!);
    });

    it('can be updated in storage', async () => {
        const storage = ExportMapper.Instance;

        const exp = await storage.Create(
            'test suite',
            new ExportRecord({
                container_id: containerID,
                adapter: 'gremlin',
                config: new StandardExporterConfig()
            })
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        exp.value.status = 'processing';

        const updateResult = await storage.Update('test-suite', exp.value);
        expect(updateResult.isError).false;

        const retrieved = await storage.Retrieve(exp.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.status).eq('processing');

        return storage.Delete(exp.value.id!);
    });
});
