import {User} from '../../../domain_objects/access_management/user';
import Logger from '../../../services/logger';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container, {ContainerExport} from '../../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';
import DataSourceRepository, {DataSourceFactory} from '../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import StandardDataSourceImpl from '../../../interfaces_and_impl/data_warehouse/import/standard_data_source_impl';
import HttpDataSourceImpl from '../../../interfaces_and_impl/data_warehouse/import/http_data_source_impl';
import {toStream} from '../../../services/utilities';
import Import from '../../../domain_objects/data_warehouse/import/import';
import TimeseriesDataSourceImpl from '../../../interfaces_and_impl/data_warehouse/import/timeseries_data_source';
import fs from 'fs';
import FileRepository from '../../../data_access_layer/repositories/data_warehouse/data/file_repository';
import ContainerRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/container_respository';
import {DataSource} from '../../../interfaces_and_impl/data_warehouse/import/data_source';

// some general tests on data sources that aren't specific to the implementation
describe('A Datasource Repository', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let dataSource: StandardDataSourceImpl | HttpDataSourceImpl | TimeseriesDataSourceImpl | undefined;
    let mappingID: string;

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

        // we're going to build at least one data source from scratch before
        // so that tests can use this instead of building their own if they can
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
        dataSource = await new DataSourceFactory().fromDataSourceRecord(exp.value);

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(containerID);
        void PostgresAdapter.Instance.close();
        return Promise.resolve();
    });

    it('will not delete data source if data is present', async () => {
        // build the data source first
        const sourceRepo = new DataSourceRepository();

        const source = await new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        let results = await sourceRepo.save(source!, user);
        expect(results.isError).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        // now we create an import through the datasource
        const newImport = await source!.ReceiveData(toStream([test_payload]), user, {overrideJsonStream: true, bufferSize: 1});
        expect(newImport.isError).false;
        expect((newImport.value as Import).id).not.undefined;

        // first delete attempt should fail as there is an import
        results = await sourceRepo.delete(source!);
        expect(results.isError).true;

        // now force
        results = await sourceRepo.delete(source!, {force: true});
        expect(results.isError).false;

        return Promise.resolve();
    });

    it('can delete when delete with data is specified', async () => {
        // build the data source first
        const sourceRepo = new DataSourceRepository();

        const source = await new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        let results = await sourceRepo.save(source!, user);
        expect(results.isError).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        // now we create an import through the datasource
        const newImport = await source!.ReceiveData(toStream([test_payload]), user, {overrideJsonStream: true, bufferSize: 1});
        expect(newImport.isError).false;
        expect((newImport.value as Import).id).not.undefined;

        // first delete attempt should fail as there is an import
        results = await sourceRepo.delete(source!);
        expect(results.isError).true;

        // now force
        results = await sourceRepo.delete(source!, {force: true, removeData: true});
        expect(results.isError).false;

        return Promise.resolve();
    });

    it('can set and review status', async () => {
        // build the data source first
        const sourceRepo = new DataSourceRepository();

        const source = await new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        let results = await sourceRepo.save(source!, user);
        expect(results.isError).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        const set = await sourceRepo.setStatus(source!, user, 'error', 'test error');
        expect(set.isError).false;

        const retrieved = await sourceRepo.findByID(source?.DataSourceRecord?.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.DataSourceRecord).not.undefined;
        expect(retrieved.value.DataSourceRecord?.status).eq('error');
        expect(retrieved.value.DataSourceRecord?.status_message).eq('test error');

        return sourceRepo.delete(source!, {force: true});
    });

    it('can import data sources from a container export file', async () => {
        // build the data source first
        const sourceRepo = new DataSourceRepository();

        const source = await new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        let results = await sourceRepo.save(source!, user);
        expect(results.isError).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        const sourceExport = await sourceRepo.listForExport(containerID);
        expect(sourceExport.isError).false;
        expect(sourceExport.value.length > 0);

        let containerExport: ContainerExport = new ContainerExport();
        containerExport.data_sources = sourceExport.value as DataSource[];

        const containerRepo = new ContainerRepository();
        // create a file from the export
        const file = await containerRepo.createContainerExportFile(containerID, user, containerExport);

        // now lets check the download
        let writer = fs.createWriteStream(`${containerID}_export.json`);

        let downloadStream = await new FileRepository().downloadFile(file.value);
        expect(downloadStream).not.undefined;

        return new Promise((resolve) => {
            downloadStream?.on('end', async function () {
                // perform data source import
                const fileBuffer = fs.readFileSync(`${containerID}_export.json`);

                const dataSourceImport = await sourceRepo.importDataSources(containerID!, user, fileBuffer);
                expect(dataSourceImport.isError).false;

                fs.unlinkSync(`${containerID}_export.json`);
                void sourceRepo.delete(source!, {force: true});
                resolve(undefined);
            });
            downloadStream?.pipe(writer);
        });
    }).timeout(4000);
});

const test_payload = {
    test: 'test',
};
