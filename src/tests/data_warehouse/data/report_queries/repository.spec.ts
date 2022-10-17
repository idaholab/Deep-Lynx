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
import ReportQuery from '../../../../domain_objects/data_warehouse/data/report_query';
import {User} from '../../../../domain_objects/access_management/user';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import ReportQueryRepository from '../../../../data_access_layer/repositories/data_warehouse/data/report_query_repository';

describe('A Report Query Repository', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let dataSourceID = '';
    let fileID = '';
    let reportID = '';
    let user: User;

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

        const report = await ReportMapper.Instance.Create(
            'test suite',
            new Report({
                container_id: containerID,
                status_message: faker.random.alphaNumeric(),
                notify_users: true
            }),
        );

        expect(report.isError).false;
        expect(report.value).not.empty;
        expect(report.value.status).to.equal('ready');
        reportID = report.value.id!;

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

        return Promise.resolve();
    });

    after(async () => {
        await ReportMapper.Instance.Delete(reportID);
        await FileMapper.Instance.Delete(fileID);
        await DataSourceMapper.Instance.Delete(dataSourceID);
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can save and update a query with report id', async () => {
        const repository = new ReportQueryRepository();
        const rQuery = new ReportQuery({
            report_id: reportID,
            query: `{metatypes{Requirement{id name}}}`,
            status_message: faker.random.alphaNumeric(),
        });

        let results = await repository.save(rQuery);
        expect(results.isError).false;
        expect(rQuery.id).not.undefined;

        // now run an update
        const updatedMessage = faker.random.alphaNumeric();
        rQuery.status_message = updatedMessage;

        results = await repository.save(rQuery);
        expect(results.isError).false;
        expect(rQuery.id).not.undefined;
        expect(rQuery.status_message).eq(updatedMessage);

        return repository.delete(rQuery);
    });

    it('can save and update a query without report id', async () => {
        const repository = new ReportQueryRepository();
        const rQuery = new ReportQuery({
            query: `{metatypes{Requirement{id name}}}`,
            status_message: faker.random.alphaNumeric(),
        });

        let results = await repository.save(rQuery);
        expect(results.isError).false;
        expect(rQuery.id).not.undefined;

        // now run an update
        const updatedMessage = faker.random.alphaNumeric();
        rQuery.status_message = updatedMessage;

        results = await repository.save(rQuery);
        expect(results.isError).false;
        expect(rQuery.id).not.undefined;
        expect(rQuery.status_message).eq(updatedMessage);

        return repository.delete(rQuery);
    });

    it('can delete a Report Query', async () => {
        const repository = new ReportQueryRepository();
        const rQuery = new ReportQuery({
            report_id: reportID,
            query: `{metatypes{Requirement{id name}}}`,
            status_message: faker.random.alphaNumeric(),
        });

        const results = await repository.save(rQuery);
        expect(results.isError).false;

        const deleted = await repository.delete(rQuery);
        expect(deleted.isError).false;

        return Promise.resolve();
    });

    it('can query, list, and count Report Queries', async () => {
        const repository = new ReportQueryRepository();
        const rQuery1 = new ReportQuery({
            report_id: reportID,
            query: `{metatypes{Requirement{id name}}}`,
            status_message: faker.random.alphaNumeric(),
        });
        const rQuery2 = new ReportQuery({
            report_id: reportID,
            query: `{metatypes{Requirement{id name}}}`,
            status_message: faker.random.alphaNumeric(),
        });

        const save1 = await repository.save(rQuery1);
        const save2 = await repository.save(rQuery2);
        expect(save1.isError).false;
        expect(save2.isError).false;

        // simple query (test limit and offset)
        let results = await repository.list({limit: 1, offset: 0});
        expect(results.isError).false;
        expect(results).not.empty;
        expect(results.value.length).eq(1);

        // test the where clause
        results = await repository.where().statusMessage('eq', rQuery2.status_message).findAll();
        expect(results.isError).false;
        expect(results).not.empty;
        expect(results.value[0].status_message).eq(rQuery2.status_message);

        // test count
        const count = await repository.where().reportID('eq', reportID).count();
        expect(count.isError).false;
        expect(count.value).eq(2);

        const delete1 = await repository.delete(rQuery1);
        const delete2 = await repository.delete(rQuery2);
        expect(delete1.isError).false;
        expect(delete2.isError).false;

        return Promise.resolve();
    });

    it('can retrieve query by ID', async () => {
        const repository = new ReportQueryRepository();
        const rQuery = new ReportQuery({
            report_id: reportID,
            query: `{metatypes{Requirement{id name}}}`,
            status_message: faker.random.alphaNumeric(),
        });

        const results = await repository.save(rQuery);
        expect(results.isError).false;
        expect(rQuery.id).not.undefined;

        const retrieved = await repository.findByID(rQuery.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(rQuery.id);

        return repository.delete(rQuery);
    });

    it('can set status in repo', async () => {
        const repository = new ReportQueryRepository();
        const rQuery = new ReportQuery({
            report_id: reportID,
            query: `{metatypes{Requirement{id name}}}`,
            status_message: faker.random.alphaNumeric(),
        });

        const results = await repository.save(rQuery);
        expect(results.isError).false;
        expect(rQuery.id).not.undefined;

        const id = rQuery.id!
        const message = faker.random.alphaNumeric();

        const setStatus = await repository.setStatus(id, 'completed', message);
        expect(setStatus.isError).false;

        const retrieved = await repository.findByID(rQuery.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(id);
        expect(retrieved.value.status).eq('completed');
        expect(retrieved.value.status_message).eq(message);

        return repository.delete(rQuery);
    });

    it('can add/remove a file to/from a report query', async () => {
        const repository = new ReportQueryRepository();
        const rQuery = new ReportQuery({
            report_id: reportID,
            query: `{metatypes{Requirement{id name}}}`,
            status_message: faker.random.alphaNumeric(),
        });

        const results = await repository.save(rQuery);
        expect(results.isError).false;
        expect(rQuery.id).not.undefined;

        const fileAdded = await repository.addFile(rQuery, fileID);
        expect(fileAdded.isError).false;
        expect(fileAdded.value).true;

        const fileRemoved = await repository.removeFile(rQuery, fileID);
        expect(fileRemoved.isError).false;

        return repository.delete(rQuery);
    });

    it('can list all files attached to a query', async () => {
        const file2 = await FileMapper.Instance.Create(
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

        expect(file2.isError).false;
        expect(file2.value).not.empty;
        const file2ID = file2.value.id!;

        const repository = new ReportQueryRepository();
        const rQuery = new ReportQuery({
            report_id: reportID,
            query: `{metatypes{Requirement{id name}}}`,
            status_message: faker.random.alphaNumeric(),
        });

        const results = await repository.save(rQuery);
        expect(results.isError).false;
        expect(rQuery.id).not.undefined;

        const file1added = await repository.addFile(rQuery, fileID);
        expect(file1added.isError).false;
        const file2added = await repository.addFile(rQuery, file2ID);
        expect(file2added.isError).false;

        const fileList = await repository.listFiles(rQuery);
        expect(fileList.isError).false;
        expect(fileList.value.length).eq(2);

        const file1removed = await repository.removeFile(rQuery, fileID);
        expect(file1removed.isError).false;
        const file2removed = await repository.removeFile(rQuery, file2ID);
        expect(file2removed.isError).false;const fileRemoved = await repository.removeFile(rQuery, fileID);
        expect(fileRemoved.isError).false;

        return repository.delete(rQuery);
    });
});