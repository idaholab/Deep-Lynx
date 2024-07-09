import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import ReportMapper from '../../../../data_access_layer/mappers/data_warehouse/data/report_mapper';
import Report from '../../../../domain_objects/data_warehouse/data/report';
import FileMapper from '../../../../data_access_layer/mappers/data_warehouse/data/file_mapper';
import File from '../../../../domain_objects/data_warehouse/data/file';
import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';

describe('A Report Mapper', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let dataSourceID = '';
    let fileID = '';

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping report tests, no mapper layer');
            this.skip();
        }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;

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

        const ds = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(ds.isError).false;
        expect(ds.value).not.empty;
        dataSourceID = ds.value.id!;

        const file = await FileMapper.Instance.Create(
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
        fileID = file.value.id!;

        return Promise.resolve();
    });

    after(async () => {
        await FileMapper.Instance.Delete(fileID);
        await DataSourceMapper.Instance.Delete(dataSourceID);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can be saved to mapper', async () => {
        const mapper = ReportMapper.Instance;

        const report = await mapper.Create(
            'test suite',
            new Report({
                container_id: containerID,
                status_message: faker.random.alphaNumeric()
            }),
        );

        expect(report.isError).false;
        expect(report.value).not.empty;
        expect(report.value.status).to.equal('ready');

        return mapper.Delete(report.value.id!);
    });

    it('can be retrieved from mapper', async () => {
        const mapper = ReportMapper.Instance;

        const report = await mapper.Create(
            'test suite',
            new Report({
                container_id: containerID,
                status_message: faker.random.alphaNumeric()
            }),
        );

        expect(report.isError).false;
        expect(report.value).not.empty;

        const retrieved = await mapper.Retrieve(report.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(report.value.id);

        return mapper.Delete(report.value.id!);
    });

    it('can be updated in mapper', async () => {
        const mapper = ReportMapper.Instance;

        const report = await mapper.Create(
            'test suite',
            new Report({
                container_id: containerID,
                status_message: faker.random.alphaNumeric()
            }),
        );

        expect(report.isError).false;
        expect(report.value).not.empty;

        const updatedMessage = faker.random.alphaNumeric();

        report.value.status_message = updatedMessage;

        const updateResult = await mapper.Update(report.value);
        expect(updateResult.isError).false;

        const retrieved = await mapper.Retrieve(report.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(report.value.id);
        expect(retrieved.value.status_message).eq(updatedMessage);

        return mapper.Delete(report.value.id!);
    });

    it('can change status in mapper', async () => {
        const mapper = ReportMapper.Instance;

        const report = await mapper.Create(
            'test suite',
            new Report({
                container_id: containerID,
                status_message: faker.random.alphaNumeric()
            }),
        );

        expect(report.isError).false;
        expect(report.value).not.empty;

        const id = report.value.id!;
        const message = faker.random.alphaNumeric();

        const setStatus = await mapper.SetStatus(id, 'completed', message);
        expect(setStatus.isError).false;

        const retrieved = await mapper.Retrieve(id);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(id);
        expect(retrieved.value.status).eq('completed');
        expect(retrieved.value.status_message).eq(message);

        return mapper.Delete(report.value.id!);
    })

    it('can be deleted', async () => {
        const mapper = ReportMapper.Instance;

        const report = await mapper.Create(
            'test suite',
            new Report({
                container_id: containerID,
                status_message: faker.random.alphaNumeric()
            }),
        );

        expect(report.isError).false;
        expect(report.value).not.empty;

        const deleted = await mapper.Delete(report.value.id!);
        expect(deleted.isError).false;

        return Promise.resolve();
    });
});