import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../services/logger';
import DataSourceMapper from '../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import TypeMappingMapper from '../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';
import DataSourceRecord, {TimeseriesColumn, TimeseriesDataSourceConfig} from '../../domain_objects/data_warehouse/import/data_source';
import TypeMapping from '../../domain_objects/data_warehouse/etl/type_mapping';
import TypeTransformationMapper from '../../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper';
import TypeTransformation, {KeyMapping} from '../../domain_objects/data_warehouse/etl/type_transformation';
import TimeseriesEntry, {TimeseriesData} from '../../domain_objects/data_warehouse/data/timeseries';
import TimeseriesEntryRepository from '../../data_access_layer/repositories/data_warehouse/data/timeseries_entry_repository';
import {GraphQLInt, GraphQLObjectType} from 'graphql';
import {graphql} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import DataSourceRepository, {DataSourceFactory} from '../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import {User} from '../../domain_objects/access_management/user';
import fs from 'fs';
import DataSourceGraphQLSchemaGenerator from '../../graphql/timeseries_schema';

describe('A Data Source Schema Generator', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let transformationID: string = '';
    let dataSourceID: string = '';
    let user: User;
    let stdDataSourceID: string = '';

    if(process.env.TIMESCALEDB_ENABLED === "false") {return}

    // this covers testing the hypertable creation and deletion as well
    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();
        const mapper = ContainerStorage.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

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

        const stdDataSource = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(stdDataSource.isError).false;
        expect(stdDataSource.value).not.empty;

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: stdDataSource.value.id!,
                sample_payload: test_raw_payload,
            }),
        );

        const transformation = await TypeTransformationMapper.Instance.Create(
            'test suite',
            new TypeTransformation({
                name: 'Test',
                type_mapping_id: mapping.value.id!,
                type: 'timeseries',
                keys: [
                    new KeyMapping({
                        key: 'RADIUS',
                        column_name: 'radius',
                        value_type: 'float',
                    }),
                    new KeyMapping({
                        key: 'COLOR',
                        column_name: 'color',
                        value_type: 'string',
                    }),
                    new KeyMapping({
                        key: 'OPEN',
                        column_name: 'open',
                        value_type: 'boolean',
                    }),
                    new KeyMapping({
                        key: 'AT',
                        column_name: 'at',
                        value_type: 'date',
                        is_primary_timestamp: true,
                    }),
                ],
            }),
        );

        expect(transformation.isError).false;
        transformationID = transformation.value.id!;

        let created = await TypeTransformationMapper.Instance.CreateHypertable(transformation.value);
        expect(created.isError, created.error?.error).false;

        const entries = [
            new TimeseriesEntry({
                transformation_id: transformationID,
                data: [
                    new TimeseriesData({
                        column_name: 'radius',
                        value_type: 'float',
                        value: 1.2,
                    }),
                    new TimeseriesData({
                        column_name: 'color',
                        value_type: 'string',
                        value: 'green',
                    }),
                    new TimeseriesData({
                        column_name: 'open',
                        value_type: 'boolean',
                        value: false,
                    }),
                    new TimeseriesData({
                        column_name: 'at',
                        value_type: 'timestamp',
                        value: new Date(),
                    }),
                ],
            }),
            new TimeseriesEntry({
                transformation_id: transformationID,
                data: [
                    new TimeseriesData({
                        column_name: 'radius',
                        value_type: 'float',
                        value: 0.2,
                    }),
                    new TimeseriesData({
                        column_name: 'color',
                        value_type: 'string',
                        value: 'blue',
                    }),
                    new TimeseriesData({
                        column_name: 'open',
                        value_type: 'boolean',
                        value: false,
                    }),
                    new TimeseriesData({
                        column_name: 'at',
                        value_type: 'timestamp',
                        value: new Date(),
                    }),
                ],
            }),
        ];

        const repo = new TimeseriesEntryRepository();

        const saved = await repo.bulkSave(entries);

        expect(saved.isError, saved.error?.error).false;

        const sourceRepo = new DataSourceRepository();

        let source = new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source Timeseries GraphQL',
                active: false,
                adapter_type: 'timeseries',
                config: new TimeseriesDataSourceConfig({
                    columns: [
                        {
                            column_name: 'primary_timestamp',
                            property_name: 'Timestamp',
                            is_primary_timestamp: true,
                            type: 'date',
                            date_conversion_format_string: 'YYYY-MM-DD HH:MI:SS',
                        },
                        {
                            column_name: 'temperature',
                            property_name: 'Temperature (K)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                        {
                            column_name: 'velocity_i',
                            property_name: 'Velocity[i] (m/s)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                        {
                            column_name: 'velocity_j',
                            property_name: 'Velocity[j] (m/s)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                        {
                            column_name: 'x',
                            property_name: 'X (m)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                        {
                            column_name: 'y',
                            property_name: 'Y (m)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                        {
                            column_name: 'z',
                            property_name: 'Z (m)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                    ] as TimeseriesColumn[],
                }),
            }),
        );

        let results = await sourceRepo.save(source!, user);
        expect(results.isError, results.error?.error).false;
        expect(source!.DataSourceRecord?.id).not.undefined;
        dataSourceID = source!.DataSourceRecord!.id!;

        // write the json test data out to a temporary file
        fs.writeFileSync('./test-timeseries-datasource-graphql.json', sampleJSON);

        // now we create an import through the datasource
        let received = await source!.ReceiveData(fs.createReadStream('./test-timeseries-datasource-graphql.json'), user);
        expect(received.isError, received.error?.error).false;

        // standard datasource will be used to test for expected failure with non-timeseries datasource
        stdDataSourceID = stdDataSource!.value.id!;

        return Promise.resolve();
    });

    after(async () => {
        await TypeTransformationMapper.Instance.DeleteHypertable(transformationID);
        // we have to delete datasource manually so hypertable gets deleted, hopefully that eventually
        // gets handled as hypertable should always be deleted with the datasource and container
        await DataSourceMapper.Instance.DeleteWithData(dataSourceID);
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(containerID);
        // force close of database connection
        void PostgresAdapter.Instance.close();

        fs.unlinkSync('./test-timeseries-datasource-graphql.json');
        return Promise.resolve();
    });

    it('can generate the proper timeseries shcema', async () => {
        const schemaGenerator = new DataSourceGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForDataSource(dataSourceID, {});
        expect(schema.isError, schema.error?.error).false;

        const typeMap = schema.value.getTypeMap();
        expect(typeMap['Timeseries']).not.undefined;

        expect((typeMap['Timeseries'] as GraphQLObjectType).getFields()['primary_timestamp'].type).eq(GraphQLJSON);
        expect((typeMap['Timeseries'] as GraphQLObjectType).getFields()['temperature'].type).eq(GraphQLInt);
        expect((typeMap['Timeseries'] as GraphQLObjectType).getFields()['velocity_i'].type).eq(GraphQLInt);
        expect((typeMap['Timeseries'] as GraphQLObjectType).getFields()['velocity_j'].type).eq(GraphQLInt);
        expect((typeMap['Timeseries'] as GraphQLObjectType).getFields()['x'].type).eq(GraphQLInt);
        expect((typeMap['Timeseries'] as GraphQLObjectType).getFields()['y'].type).eq(GraphQLInt);
        expect((typeMap['Timeseries'] as GraphQLObjectType).getFields()['z'].type).eq(GraphQLInt);

        return Promise.resolve();
    });

    it('can run simple queries against timeseries data sources', async () => {
        const schemaGenerator = new DataSourceGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForDataSource(dataSourceID, {});
        expect(schema.isError, schema.error?.error).false;

        try {
            let results = await graphql({
                schema: schema.value,
                source: simpleQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Timeseries.length).gt(1);
        } catch (e: any) {
            expect.fail(e);
        }

        return Promise.resolve();
    });

    it('fails when a non-timeseries datasource is supplied', async () => {
        const schemaGenerator = new DataSourceGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForDataSource(stdDataSourceID, {});
        expect(schema.isError).true;

        return Promise.resolve();
    });

    it('can successfully apply limits to a query', async () => {
        const schemaGenerator = new DataSourceGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForDataSource(dataSourceID, {});
        expect(schema.isError, schema.error?.error).false;

        try {
            let results = await graphql({
                schema: schema.value,
                source: limitQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Timeseries.length).eq(1);
        } catch (e: any) {
            expect.fail(e);
        }

        return Promise.resolve();
    });

    it('can successfully filter based on time data', async () => {
        const schemaGenerator = new DataSourceGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForDataSource(dataSourceID, {});
        expect(schema.isError, schema.error?.error).false;

        try {
            let results = await graphql({
                schema: schema.value,
                source: timeQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Timeseries.length).gt(1);
        } catch (e: any) {
            expect.fail(e);
        }

        return Promise.resolve();
    });

    it('can successfully filter based on non-time data', async () => {
        const schemaGenerator = new DataSourceGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForDataSource(dataSourceID, {});
        expect(schema.isError, schema.error?.error).false;

        try {
            let results = await graphql({
                schema: schema.value,
                source: temperatureQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Timeseries.length).eq(6);
        } catch (e: any) {
            expect.fail(e);
        }

        return Promise.resolve();
    });

    it('can query timeseries datasource introspectively', async () => {
        const schemaGenerator = new DataSourceGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForDataSource(dataSourceID, {});
        expect(schema.isError, schema.error?.error).false;

        try {
            let results = await graphql({
                schema: schema.value,
                source: introspectiveQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data!.__type.fields.length).eq(8);
        } catch (e: any) {
            expect.fail(e);
        }

        return Promise.resolve();
    });
});

const test_raw_payload = {
    RAD: 0.1,
    COLOR: 'blue',
    OPEN: true,
    AT: '2022-04-20T14:30:21.018Z',
};

const sampleJSON = JSON.stringify([
    {
        Timestamp: '2022-07-18 02:32:27.877058',
        'Temperature (K)': 230,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 2,
        'Y (m)': 7,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.877059',
        'Temperature (K)': 236,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 4,
        'Y (m)': 2,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.817059',
        'Temperature (K)': 271,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 8,
        'Y (m)': 4,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.812059',
        'Temperature (K)': 280,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 3,
        'Y (m)': 2,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.312059',
        'Temperature (K)': 299,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 8,
        'Y (m)': 8,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.412059',
        'Temperature (K)': 344,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 7,
        'Y (m)': 9,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.612059',
        'Temperature (K)': 245,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 6,
        'Y (m)': 0,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.512059',
        'Temperature (K)': 260,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 1,
        'Y (m)': 6,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.522059',
        'Temperature (K)': 291,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 0,
        'Y (m)': 1,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.532059',
        'Temperature (K)': 235,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 5,
        'Y (m)': 3,
        'Z (m)': 0,
    },
]);

const simpleQuery = `{
    Timeseries {
        primary_timestamp
        temperature
        velocity_i
        velocity_j
        x
        y
        z
    }
}`;

const limitQuery = `{
    Timeseries(_record: {limit: 1}) {
        primary_timestamp
        temperature
        velocity_i
        velocity_j
        x
        y
        z
    }
}`;

const timeQuery = `{
    Timeseries(primary_timestamp: {operator: ">" , value: "2001-01-01"}) {
        primary_timestamp
        temperature
        velocity_i
        velocity_j
        x
        y
        z
    }
}`;

const temperatureQuery = `{
    Timeseries(temperature: {operator: ">", value: 250}) {
        primary_timestamp
        temperature
        velocity_i
        velocity_j
        x
        y
        z
    }
}`;

const introspectiveQuery = `{
    __type(name: "Timeseries"){
        name
        fields{
            name
            type{
                name
            }
        }
    }
}`;