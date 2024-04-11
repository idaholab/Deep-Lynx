import {User} from '../../../domain_objects/access_management/user';
import Logger from '../../../services/logger';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceRecord, {P6DataSourceConfig} from '../../../domain_objects/data_warehouse/import/data_source';
import DataSourceRepository, {DataSourceFactory} from '../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';

// P6 is super simple currently- make sure we can save it correctly
describe('A P6 data source implementation', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping p6 tests, no storage layer');
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
        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can be saved', async () => {
        // build the data source first
        const sourceRepo = new DataSourceRepository();

        const config = new P6DataSourceConfig();
        config.endpoint = 'test.com'
        config.projectID = 'test123'
        config.username = faker.name.findName();
        config.password = 'password'

        const source = await new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test P6 Source',
                active: false,
                adapter_type: 'p6',
                data_format: 'json',
                config: config,
            }),
        );

        let results = await sourceRepo.save(source!, user);
        if (results.isError) {console.log(results.error.error)}

        expect(results.isError).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        return Promise.resolve();
    });
});