import DataSourceRepository, {DataSourceFactory} from '../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import {expect} from 'chai';
import TimeseriesBucketDataSourceImpl from '../../../interfaces_and_impl/data_warehouse/import/timeseries_bucket_data_source';
import DataSourceRecord, {TimeseriesBucketDataSourceConfig} from '../../../domain_objects/data_warehouse/import/data_source';
import {User} from '../../../domain_objects/access_management/user';
import TimeseriesService from '../../../services/timeseries/timeseries';
import Logger from '../../../services/logger';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import {Bucket} from 'deeplynx-timeseries';

describe('A Timeseries Bucket Data Source', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let dataSource: TimeseriesBucketDataSourceImpl | undefined;
    const bucketRepo = TimeseriesService.GetInstance();
    let sourceRepo: DataSourceRepository | undefined;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
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
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(containerID);
        void PostgresAdapter.Instance.close();
        return Promise.resolve();
    });

    it('can be created through the data source repo', async () => {
        const sourceRepo = new DataSourceRepository();

        let source = await new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Bucket Source',
                adapter_type: 'timeseries_bucket',
                config: new TimeseriesBucketDataSourceConfig({
                    change_bucket_payload: {
                        name: 'Test Bucket',
                        columns: [
                            {
                                name: 'test column',
                                shortName: 'test',
                                dataType: 'INT',
                            },
                        ],
                    },
                }),
            }),
        );
        const saved = await sourceRepo.save(source!, user);
        expect(saved.isError, saved.error?.error).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        const config = source?.DataSourceRecord?.config as TimeseriesBucketDataSourceConfig;
        expect(config.bucket?.id).not.undefined;
        expect(config.bucket?.name).eq('Test Bucket');

        const column = config.bucket?.structure[0];
        expect(column?.name).eq('test column');
        expect(column?.shortName).eq('test');
        expect(column?.dataType).eq('INT');

        const deleted = await sourceRepo.delete(source!);
        expect(deleted.isError, deleted.error?.error).false;

        return Promise.resolve();
    });

    it('can create two buckets with the same name but differnt IDs', async () => {
        const sourceRepo = new DataSourceRepository();

        const source1 = await new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Bucket Source 1',
                adapter_type: 'timeseries_bucket',
                config: new TimeseriesBucketDataSourceConfig({
                    change_bucket_payload: {
                        name: 'Test Bucket',
                        columns: [
                            {
                                name: 'test column',
                                shortName: 'test',
                                dataType: 'INT',
                            },
                        ],
                    },
                }),
            }),
        );
        let saved = await sourceRepo.save(source1!, user);
        expect(saved.isError, saved.error?.error).false;
        expect(source1!.DataSourceRecord?.id).not.undefined;
        const bucket1 = (source1?.DataSourceRecord?.config as TimeseriesBucketDataSourceConfig).bucket;

        expect(bucket1?.name).eq('Test Bucket');
        expect(bucket1?.structure[0].name).eq('test column');
        expect(bucket1?.structure[0].shortName).eq('test');
        expect(bucket1?.structure[0].dataType).eq('INT');

        // this should create a new bucket as bucket names are not unique
        const source2 = await new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Bucket Source 2',
                adapter_type: 'timeseries_bucket',
                config: new TimeseriesBucketDataSourceConfig({
                    change_bucket_payload: {
                        name: 'Test Bucket',
                        columns: [
                            {
                                name: 'test column',
                                shortName: 'test',
                                dataType: 'INT',
                            },
                        ],
                    },
                }),
            }),
        );
        saved = await sourceRepo.save(source2!, user);
        expect(saved.isError, saved.error?.error).false;
        expect(source1!.DataSourceRecord?.id).not.undefined;
        const bucket2 = (source2?.DataSourceRecord?.config as TimeseriesBucketDataSourceConfig).bucket;

        expect(bucket2?.name).eq('Test Bucket');
        expect(bucket2?.structure[0].name).eq('test column');
        expect(bucket2?.structure[0].shortName).eq('test');
        expect(bucket2?.structure[0].dataType).eq('INT');

        // ensure that the two bucket IDs are different even though the structure is identical
        expect(bucket1!.id).not.eq(bucket2!.id);

        let deleted = await sourceRepo.delete(source1!);
        expect(deleted.isError, deleted.error?.error).false;
        deleted = await sourceRepo.delete(source2!);
        expect(deleted.isError, deleted.error?.error).false;

        return Promise.resolve();
    });

    it('can be retrieved from the data source repo', async () => {
        const sourceRepo = new DataSourceRepository();

        let source = await new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Bucket Source',
                adapter_type: 'timeseries_bucket',
                config: new TimeseriesBucketDataSourceConfig({
                    change_bucket_payload: {
                        name: 'Test Bucket',
                        columns: [
                            {
                                name: 'test column',
                                shortName: 'test',
                                dataType: 'INT',
                            },
                        ],
                    },
                }),
            }),
        );
        const saved = await sourceRepo.save(source!, user);
        expect(saved.isError, saved.error?.error).false;
        expect(source!.DataSourceRecord?.id).not.undefined;
        const sourceId = source?.DataSourceRecord?.id!;

        const config = source?.DataSourceRecord?.config as TimeseriesBucketDataSourceConfig;
        expect(config.bucket?.id).not.undefined;
        const bucketId = config.bucket?.id!;

        const fetchedSource = await sourceRepo.findByID(sourceId);
        expect(fetchedSource.value.DataSourceRecord?.id).not.undefined;
        expect(fetchedSource.value.DataSourceRecord?.id).eq(sourceId);
        const fetchedBucket = (fetchedSource.value.DataSourceRecord?.config as TimeseriesBucketDataSourceConfig).bucket;
        expect(fetchedBucket?.id).not.undefined;
        expect(fetchedBucket?.id).eq(bucketId);

        const deleted = await sourceRepo.delete(source!);
        expect(deleted.isError, deleted.error?.error).false;

        return Promise.resolve();
    });

    it('can be updated through the data source repo', async () => {
        const sourceRepo = new DataSourceRepository();

        // save initial bucket source
        const source = await new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Bucket Source',
                adapter_type: 'timeseries_bucket',
                config: new TimeseriesBucketDataSourceConfig({
                    change_bucket_payload: {
                        name: 'Test Bucket',
                        columns: [
                            {
                                name: 'test column',
                                shortName: 'test',
                                dataType: 'INT',
                            },
                        ],
                    },
                }),
            }),
        );
        const saved = await sourceRepo.save(source!, user);
        expect(saved.isError, saved.error?.error).false;

        // check source values
        expect(source!.DataSourceRecord?.id).not.undefined;
        const sourceId = source?.DataSourceRecord?.id!;
        expect(source?.DataSourceRecord?.name).eq('Test Bucket Source');

        // check bucket values
        const bucket = (source?.DataSourceRecord?.config as TimeseriesBucketDataSourceConfig).bucket;
        expect(bucket?.id).not.undefined;
        const bucketId = bucket?.id!;
        expect(bucket?.name).eq('Test Bucket');
        expect(bucket?.structure[0].dataType).eq('INT');

        // change source name, bucket name, and bucket column datatype
        source!.DataSourceRecord!.name = 'Updated Bucket Source';
        const config = source?.DataSourceRecord?.config as TimeseriesBucketDataSourceConfig;
        config.change_bucket_payload = {
            name: 'New Bucket',
            columns: [
                {
                    name: 'test column',
                    shortName: 'test',
                    dataType: 'TEXT',
                },
            ],
        };

        // update source
        const updated = await sourceRepo.save(source!, user);
        expect(updated.isError, updated.error?.error).false;

        // check source values
        expect(source?.DataSourceRecord?.id).eq(sourceId);
        expect(source?.DataSourceRecord?.name).eq('Updated Bucket Source');

        // check bucket values
        const updatedBucket = (source?.DataSourceRecord?.config as TimeseriesBucketDataSourceConfig).bucket;
        expect(updatedBucket?.id).not.undefined;
        expect(updatedBucket?.id).eq(bucketId);
        expect(updatedBucket?.name).eq('New Bucket');
        expect(updatedBucket?.structure[0].dataType).eq('TEXT');

        const deleted = await sourceRepo.delete(source!);
        expect(deleted.isError, deleted.error?.error).false;

        return Promise.resolve();
    });

    it('will delete the associated bucket upon source deletion', async () => {
        const sourceRepo = new DataSourceRepository();

        let source = await new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Bucket Source',
                adapter_type: 'timeseries_bucket',
                config: new TimeseriesBucketDataSourceConfig({
                    change_bucket_payload: {
                        name: 'Test Bucket',
                        columns: [
                            {
                                name: 'test column',
                                shortName: 'test',
                                dataType: 'INT',
                            },
                        ],
                    },
                }),
            }),
        );
        const saved = await sourceRepo.save(source!, user);
        expect(saved.isError, saved.error?.error).false;
        expect(source!.DataSourceRecord?.id).not.undefined;
        const sourceId = source?.DataSourceRecord?.id;

        const config = source?.DataSourceRecord?.config as TimeseriesBucketDataSourceConfig;
        expect(config.bucket?.id).not.undefined;
        const bucketId = config.bucket?.id;

        const deleted = await sourceRepo.delete(source!);
        expect(deleted.isError, deleted.error?.error).false;

        // ensure source was deleted
        const fetchedSource = await sourceRepo.findByID(sourceId!);
        expect(fetchedSource.isError).true;

        // ensure bucket was also deleted
        let error: object | undefined;
        try {
            await (await TimeseriesService.GetInstance()).retrieveBucket(bucketId!);
        } catch (e) {
            error = e as object;
        }
        expect(error).not.undefined;

        return Promise.resolve();
    });
});
