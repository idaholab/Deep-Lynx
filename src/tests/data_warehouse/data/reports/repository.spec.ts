import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import ReportRepository from '../../../../data_access_layer/repositories/data_warehouse/data/report_repository';
import Report from '../../../../domain_objects/data_warehouse/data/report';
import FileMapper from '../../../../data_access_layer/mappers/data_warehouse/data/file_mapper';
import File from '../../../../domain_objects/data_warehouse/data/file';
import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import MetatypeRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import {User} from '../../../../domain_objects/access_management/user';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import MetatypeRelationshipKeyMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_key_mapper';
import exp from 'constants';
import { ExpiringAccessTokenCache } from '@azure/core-http';

describe('A Report Reposiory', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let dataSourceID: string = '';
    let fileID: string = '';
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
        await FileMapper.Instance.Delete(fileID);
        await DataSourceMapper.Instance.Delete(dataSourceID);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can save and update a Report', async () => {
        const repository = new ReportRepository();
        const report = new Report({
            container_id: containerID,
            status_message: faker.random.alphaNumeric(),
            notify_users: true
        });

        let results = await repository.save(report, user);
        expect(results.isError).false;
        expect(report.id).not.undefined;

        // now run an update
        const updatedMessage = faker.random.alphaNumeric();
        report.status_message = updatedMessage;

        results = await repository.save(report, user);
        expect(results.isError).false;
        expect(report.id).not.undefined;
        expect(report.status_message).eq(updatedMessage);

        return repository.delete(report);
    });

    it('can delete a Report', async () => {
        const repository = new ReportRepository();
        const report = new Report({
            container_id: containerID,
            status_message: faker.random.alphaNumeric(),
            notify_users: true
        });

        const results = await repository.save(report, user);
        expect(results.isError).false;

        const deleted = await repository.delete(report);
        expect(deleted.isError).false;

        return Promise.resolve();
    });

    it('can query, list, and count Reports', async () => {
        const repository = new ReportRepository();
        const report1 = new Report({
            container_id: containerID,
            status_message: faker.random.alphaNumeric(),
            notify_users: true
        });
        const report2 = new Report({
            container_id: containerID,
            status_message: faker.random.alphaNumeric(),
            notify_users: false
        });

        const save1 = await repository.save(report1, user);
        const save2 = await repository.save(report2, user);
        expect(save1.isError).false;
        expect(save2.isError).false;

        // simple query (test limit and offset)
        let results = await repository.list({limit: 1, offset: 0});
        expect(results.isError).false;
        expect(results).not.empty;
        expect(results.value.length).eq(1);

        // test the where clause
        results = await repository.where().statusMessage('eq', report1.status_message).findAll();
        expect(results.isError).false;
        expect(results).not.empty;
        expect(results.value[0].status_message).eq(report1.status_message);

        results = await repository.where().notifyUsers('eq', report2.notify_users).findAll();
        expect(results.isError).false;
        expect(results).not.empty;
        expect(results.value[0].notify_users).eq(report2.notify_users);

        results = await repository.where().containerID('eq', containerID).findAll();
        expect(results.isError).false;
        expect(results).not.empty;
        expect(results.value.length).eq(2);

        // test count
        const count = await repository.where().containerID('eq', containerID).count();
        expect(count.isError).false;
        expect(count.value).eq(2);

        const delete1 = await repository.delete(report1);
        const delete2 = await repository.delete(report2);
        expect(delete1.isError).false;
        expect(delete2.isError).false;

        return Promise.resolve();
    })

    it('can retrieve report by ID')

    it('can set status')

    it('can add a file to a Report')

    it('can remove a file from a Report')

    it('can list all files on a Report')
})