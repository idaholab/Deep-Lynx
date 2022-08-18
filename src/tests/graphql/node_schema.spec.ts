import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../services/logger';
import DataSourceMapper from '../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import MetatypeMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import MetatypeKeyMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import TypeMappingMapper from '../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';
import Metatype from '../../domain_objects/data_warehouse/ontology/metatype';
import DataSourceRecord, {TimeseriesColumn, TimeseriesDataSourceConfig, TimeseriesNodeParameter} from '../../domain_objects/data_warehouse/import/data_source';
import TypeMapping from '../../domain_objects/data_warehouse/etl/type_mapping';
import {test_keys} from '../data_warehouse/etl/type_transformation_mapper.spec';
import TypeTransformationMapper from '../../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper';
import TypeTransformation, {KeyMapping} from '../../domain_objects/data_warehouse/etl/type_transformation';
import TimeseriesEntry, {TimeseriesData} from '../../domain_objects/data_warehouse/data/timeseries';
import TimeseriesEntryRepository from '../../data_access_layer/repositories/data_warehouse/data/timeseries_entry_repository';
import Node from '../../domain_objects/data_warehouse/data/node';
import NodeMapper from '../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import {GraphQLBoolean, GraphQLFloat, GraphQLInt, GraphQLObjectType, GraphQLString} from 'graphql';
import {graphql} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import NodeGraphQLSchemaGenerator from '../../graphql/node_graph_schema';
import DataSourceRepository, {DataSourceFactory} from '../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import {User} from '../../domain_objects/access_management/user';
import {DataSource} from '../../interfaces_and_impl/data_warehouse/import/data_source';
import fs from 'fs';

describe('A Node Schema Generator', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let transformationID: string = '';
    let nodeID: string = '';
    let user: User;
    let dataSource: DataSource;

    // this covers testing the hypertable creation and deletion as well
    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();
        const mapper = ContainerStorage.Instance;
        const mMapper = MetatypeMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance;
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

        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

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

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: exp.value.id!,
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

        const mixed = new Node({
            container_id: containerID,
            metatype: metatype.value.id!,
            original_data_id: '1',
            properties: {color: 'blue'},
        });

        const node = await NodeMapper.Instance.CreateOrUpdateByCompositeID('test suite', mixed);
        expect(node.isError, metatype.error?.error).false;

        nodeID = node.value.id!;

        const nodeTransformation = await NodeMapper.Instance.AddTransformation(nodeID, transformationID);
        expect(nodeTransformation.isError).false;

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

        // this is for the new timeseries data source system
        const sourceRepo = new DataSourceRepository();

        let source = new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source Timeseries Graphql',
                active: false,
                adapter_type: 'timeseries',
                config: new TimeseriesDataSourceConfig({
                    attachment_parameters: [
                        {
                            type: 'id',
                            operator: 'eq',
                            value: nodeID,
                        },
                    ] as TimeseriesNodeParameter[],
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
        dataSource = source!;

        // write the json test data out to a temporary file
        fs.writeFileSync('./test-timeseries-data-graphql.json', sampleJSON);

        // now we create an import through the datasource
        let received = await source!.ReceiveData(fs.createReadStream('./test-timeseries-data-graphql.json'), user);
        expect(received.isError, received.error?.error).false;

        // throw another one up with non-matching parameters, so we can test that we don't see it
        source = new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'No Match Data Source',
                active: false,
                adapter_type: 'timeseries',
                config: new TimeseriesDataSourceConfig({
                    attachment_parameters: [
                        {
                            type: 'id',
                            operator: 'eq',
                            value: '1',
                        },
                    ] as TimeseriesNodeParameter[],
                    columns: [
                        {
                            column_name: 'primary_timestamp',
                            property_name: 'Timestamp',
                            is_primary_timestamp: true,
                            type: 'date',
                            date_conversion_format_string: 'YYYY-MM-DD HH:MI:SS',
                        },
                    ] as TimeseriesColumn[],
                }),
            }),
        );

        results = await sourceRepo.save(source!, user);
        expect(results.isError, results.error?.error).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        return Promise.resolve();
    });

    after(async () => {
        await TypeTransformationMapper.Instance.DeleteHypertable(transformationID);
        // we have to delete data source manually so hypertable gets deleted, hopefully that eventually gets handled
        // as hypertable should always be deleted with the datasource and container
        await DataSourceMapper.Instance.DeleteWithData(dataSource.DataSourceRecord?.id!);
        await ContainerMapper.Instance.Delete(containerID);
        // for some reason this suite of tests likes to not let go of the db, so this way we don't wait for it
        void PostgresAdapter.Instance.close();

        fs.unlinkSync('./test-timeseries-data-graphql.json');
        return Promise.resolve();
    });

    it('can generate the proper schema', async () => {
        const schemaGenerator = new NodeGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForNode(containerID, nodeID, {});
        expect(schema.isError, schema.error?.error).false;

        const typeMap = schema.value.getTypeMap();
        expect(typeMap['Test_legacy']).not.undefined;

        expect((typeMap['Test_legacy'] as GraphQLObjectType).getFields()['radius'].type).eq(GraphQLFloat);
        expect((typeMap['Test_legacy'] as GraphQLObjectType).getFields()['open'].type).eq(GraphQLBoolean);
        expect((typeMap['Test_legacy'] as GraphQLObjectType).getFields()['color'].type).eq(GraphQLString);
        expect((typeMap['Test_legacy'] as GraphQLObjectType).getFields()['at'].type).eq(GraphQLString);

        return Promise.resolve();
    });

    it('can query data correctly', async () => {
        const schemaGenerator = new NodeGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForNode(containerID, nodeID, {});
        expect(schema.isError).false;

        // double-check the schema
        const typeMap = schema.value.getTypeMap();
        expect(typeMap['Test_legacy']).not.undefined;

        expect((typeMap['Test_legacy'] as GraphQLObjectType).getFields()['radius'].type).eq(GraphQLFloat);
        expect((typeMap['Test_legacy'] as GraphQLObjectType).getFields()['open'].type).eq(GraphQLBoolean);
        expect((typeMap['Test_legacy'] as GraphQLObjectType).getFields()['color'].type).eq(GraphQLString);
        expect((typeMap['Test_legacy'] as GraphQLObjectType).getFields()['at'].type).eq(GraphQLString);

        //simple query
        try {
            let results = await graphql({
                schema: schema.value,
                source: simpleQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test_legacy.length).eq(2);
        } catch (e: any) {
            expect.fail(e);
        }

        //limit query
        try {
            let results = await graphql({
                schema: schema.value,
                source: limitQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test_legacy.length).eq(1);
        } catch (e: any) {
            expect.fail(e);
        }

        //color query
        try {
            let results = await graphql({
                schema: schema.value,
                source: colorQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test_legacy.length).eq(1);
        } catch (e: any) {
            expect.fail(e);
        }

        //color in query
        try {
            let results = await graphql({
                schema: schema.value,
                source: colorInQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test_legacy.length).eq(2);
        } catch (e: any) {
            expect.fail(e);
        }

        //time query
        try {
            let results = await graphql({
                schema: schema.value,
                source: timeQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test_legacy.length).eq(2);
        } catch (e: any) {
            expect.fail(e);
        }

        //reverse time query
        try {
            let results = await graphql({
                schema: schema.value,
                source: reverseTimeQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test_legacy.length).eq(0);
        } catch (e: any) {
            expect.fail(e);
        }

        return Promise.resolve();
    }).timeout(300000);

    it('can save data to file correctly', async () => {
        const schemaGenerator = new NodeGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForNode(containerID, nodeID, {returnFile: true});
        expect(schema.isError).false;

        //simple query
        try {
            let results = await graphql({
                schema: schema.value,
                source: simpleFileQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test_legacy.file_size).gt(0);
        } catch (e: any) {
            expect.fail(e);
        }

        return Promise.resolve();
    });

    it('can query timeseries data sources correctly', async () => {
        const schemaGenerator = new NodeGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForNode(containerID, nodeID, {});
        expect(schema.isError).false;

        // double-check the schema
        const typeMap = schema.value.getTypeMap();
        expect(typeMap['Test_Data_Source_Timeseries_Graphql']).not.undefined;
        expect(typeMap['No_Match_Data_Source']).undefined;

        expect((typeMap['Test_Data_Source_Timeseries_Graphql'] as GraphQLObjectType).getFields()['primary_timestamp'].type).eq(GraphQLJSON);
        expect((typeMap['Test_Data_Source_Timeseries_Graphql'] as GraphQLObjectType).getFields()['temperature'].type).eq(GraphQLInt);
        expect((typeMap['Test_Data_Source_Timeseries_Graphql'] as GraphQLObjectType).getFields()['velocity_i'].type).eq(GraphQLInt);
        expect((typeMap['Test_Data_Source_Timeseries_Graphql'] as GraphQLObjectType).getFields()['velocity_j'].type).eq(GraphQLInt);
        expect((typeMap['Test_Data_Source_Timeseries_Graphql'] as GraphQLObjectType).getFields()['x'].type).eq(GraphQLInt);
        expect((typeMap['Test_Data_Source_Timeseries_Graphql'] as GraphQLObjectType).getFields()['y'].type).eq(GraphQLInt);
        expect((typeMap['Test_Data_Source_Timeseries_Graphql'] as GraphQLObjectType).getFields()['z'].type).eq(GraphQLInt);

        //simple query
        try {
            let results = await graphql({
                schema: schema.value,
                source: newSimpleQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test_Data_Source_Timeseries_Graphql.length).gt(1);
        } catch (e: any) {
            expect.fail(e);
        }

        try {
            let results = await graphql({
                schema: schema.value,
                source: newLimitQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test_Data_Source_Timeseries_Graphql.length).eq(1);
        } catch (e: any) {
            expect.fail(e);
        }

        try {
            let results = await graphql({
                schema: schema.value,
                source: newTimeQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test_Data_Source_Timeseries_Graphql.length).gt(1);
        } catch (e: any) {
            expect.fail(e);
        }

        try {
            let results = await graphql({
                schema: schema.value,
                source: newTemperatureQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test_Data_Source_Timeseries_Graphql.length).eq(6);
        } catch (e: any) {
            expect.fail(e);
        }

        return Promise.resolve();
    }).timeout(300000);
});

const test_raw_payload = {
    RAD: 0.1,
    COLOR: 'blue',
    OPEN: true,
    AT: '2022-04-20T14:30:21.018Z',
};

const simpleQuery = `{
    Test_legacy {
        radius
        open
        color
        at
    }
}`;

const simpleFileQuery = `{
    Test_legacy {
        id
        file_name
        file_size
        md5hash
    }
}`;

const limitQuery = `{
    Test_legacy(_record: {limit: 1}) {
        radius
        open
        color
        at
    }
}`;

const colorQuery = `{
    Test_legacy(color: {operator: "eq", value: "blue"}) {
        radius
        open
        color
        at
    }
}`;

const colorInQuery = `{
    Test_legacy(color: {operator: "in", value: ["blue", "green"]}) {
        radius
        open
        color
        at
    }
}`;

const timeQuery = `{
    Test_legacy(at: {operator: ">", value: "2001-01-01"}) {
        radius
        open
        color
        at
    }
}`;

const reverseTimeQuery = `{
    Test_legacy(at: {operator: "<", value: "2001-01-01"}) {
        radius
        open
        color
        at
    }
}`;

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

const newSimpleQuery = `{
    Test_Data_Source_Timeseries_Graphql {
        primary_timestamp
        temperature
        velocity_i
        velocity_j
        x
        y
        z
    }
}`;

const newLimitQuery = `{
    Test_Data_Source_Timeseries_Graphql(_record: {limit: 1}) {
        primary_timestamp
        temperature
        velocity_i
        velocity_j
        x
        y
        z
    }
}`;

const newTimeQuery = `{
    Test_Data_Source_Timeseries_Graphql(primary_timestamp: {operator: ">" , value: "2001-01-01"}) {
        primary_timestamp
        temperature
        velocity_i
        velocity_j
        x
        y
        z
    }
}`;

const newTemperatureQuery = `{
    Test_Data_Source_Timeseries_Graphql(temperature: {operator: ">", value: 250}) {
        primary_timestamp
        temperature
        velocity_i
        velocity_j
        x
        y
        z
    }
}`;
