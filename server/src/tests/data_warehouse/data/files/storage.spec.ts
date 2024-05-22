import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import FileMapper from '../../../../data_access_layer/mappers/data_warehouse/data/file_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import File from '../../../../domain_objects/data_warehouse/data/file';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';

describe('A File can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let dataSourceID: string = '';

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

        const exp = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        dataSourceID = exp.value.id!;

        return Promise.resolve();
    });

    after(async () => {
        await DataSourceMapper.Instance.Delete(dataSourceID);
        await ContainerStorage.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can be saved to storage', async () => {
        const mapper = FileMapper.Instance;

        const file = await mapper.Create(
            'test suite',
            new File({
                file_name: faker.name.findName(),
                file_size: 200,
                md5hash: '',
                adapter_file_path: faker.name.findName(),
                adapter: 'filesystem',
                data_source_id: dataSourceID,
                container_id: containerID,
            }),
        );

        expect(file.isError).false;
        expect(file.value).not.empty;

        return mapper.Delete(file.value.id!);
    });

    it('can be retrieved from  storage', async () => {
        const mapper = FileMapper.Instance;

        const file = await mapper.Create(
            'test suite',
            new File({
                file_name: faker.name.findName(),
                file_size: 200,
                md5hash: '',
                adapter_file_path: faker.name.findName(),
                adapter: 'filesystem',
                data_source_id: dataSourceID,
                container_id: containerID,
            }),
        );

        const retrieved = await mapper.RetrieveByID(file.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(file.value.id);

        return mapper.Delete(file.value.id!);
    });

    it('can be updated in storage', async () => {
        const mapper = FileMapper.Instance;

        const file = await mapper.Create(
            'test suite',
            new File({
                file_name: faker.name.findName(),
                file_size: 200,
                md5hash: '',
                adapter_file_path: faker.name.findName(),
                adapter: 'filesystem',
                data_source_id: dataSourceID,
                container_id: containerID,
            }),
        );

        expect(file.isError).false;
        file.value.adapter = 'azure_blob';

        const updateResult = await mapper.Update('test-suite', file.value);
        expect(updateResult.isError).false;

        const retrieved = await mapper.RetrieveByID(file.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(file.value.id);
        expect(file.value.adapter).eq('azure_blob');

        return mapper.Delete(file.value.id!);
    });
});
