import {User} from '../../../domain_objects/access_management/user';
import Logger from '../../../services/logger';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceRecord, {JazzDataSourceConfig} from '../../../domain_objects/data_warehouse/import/data_source';
import DataSourceRepository, {DataSourceFactory} from '../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import ImportRepository from '../../../data_access_layer/repositories/data_warehouse/import/import_repository';

// some general tests on data sources that aren't specific to the implementation
describe('An Jazz Data Source can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let config: JazzDataSourceConfig;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
            this.skip();
        }

        if (process.env.JAZZ_DATA_SOURCE_URL === '') {
            Logger.debug('skipping Jazz data source tests, no data source URL');
            this.skip();
        }

        if (process.env.JAZZ_DATA_SOURCE_PROJECT_NAME === '') {
            Logger.debug('skipping Jazz data source tests, no project name');
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

        config = new JazzDataSourceConfig({
            endpoint: process.env.JAZZ_DATA_SOURCE_URL as string,
            token: process.env.JAZZ_DATA_SOURCE_TOKEN as string,
            project_name: process.env.JAZZ_DATA_SOURCE_PROJECT_NAME as string,
            artifact_types: process.env.JAZZ_DATA_SOURCE_ARTIFACT_TYPES ? process.env.JAZZ_DATA_SOURCE_ARTIFACT_TYPES.split(',') : ['System Requirement'],
            poll_interval: 1000, // don't want to have this poll more than once,
            secure: true,
            limit: 10, // should generally trigger the pagination and recursive functionality of the poll endpoint
        });

        return Promise.resolve();
    });

    after(async () => {
        if (process.env.CORE_DB_CONNECTION_STRING !== '' && process.env.JAZZ_DATA_SOURCE_URL !== '' && process.env.JAZZ_DATA_SOURCE_PROJECT_NAME !== '') {
            await UserMapper.Instance.Delete(user.id!);
            return ContainerMapper.Instance.Delete(containerID);
        }

        return Promise.resolve();
    });

    // @ts-ignore
    it('will successfully poll and store data', async () => {
        // first create and save the source
        const sourceRepo = new DataSourceRepository();

        let source = new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test JAZZ Data Source',
                active: true,
                adapter_type: 'jazz',
                config: config,
                data_format: 'json',
            }),
        );

        let results = await sourceRepo.save(source!, user);
        expect(results.isError).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        // start the poller running and wait for it to finish and process. This is
        // an inaccurate art so if your tests fails, increase this wait time first
        // prior to stepping through your code to make sure you're getting some
        // kind of result back.
        await source?.Run();

        // first fetch the data source and verify we haven't encountered an error
        // the status should still be set to "ready"
        const fetchedSource = await sourceRepo.findByID(source?.DataSourceRecord!.id!);
        expect(fetchedSource.isError).false;
        expect(fetchedSource.value.DataSourceRecord?.status).eq('ready');

        // while we can't make assumptions on how much data we fetched, we can
        // make sure we fetched something by checking the import count for the
        // data source. If you want more a more robust check of your individual
        // JAZZ source, you'll need to add more tests after this.

        const count = await new ImportRepository().where().dataSourceID('eq', source?.DataSourceRecord!.id).count();

        expect(count.isError).false;
        expect(count.value).gt(0);

        return Promise.resolve();
    }).timeout(30000); // Jazz has shown to be very slow, should help us avoid issues
});
