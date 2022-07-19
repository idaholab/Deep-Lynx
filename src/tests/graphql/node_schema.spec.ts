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
import DataSourceRecord from '../../domain_objects/data_warehouse/import/data_source';
import TypeMapping from '../../domain_objects/data_warehouse/etl/type_mapping';
import {test_keys} from '../data_warehouse/etl/type_transformation_mapper.spec';
import TypeTransformationMapper from '../../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper';
import TypeTransformation, {KeyMapping} from '../../domain_objects/data_warehouse/etl/type_transformation';
import TimeseriesEntry, {TimeseriesData} from '../../domain_objects/data_warehouse/data/timeseries';
import TimeseriesEntryRepository from '../../data_access_layer/repositories/data_warehouse/data/timeseries_entry_repository';
import Node from '../../domain_objects/data_warehouse/data/node';
import NodeMapper from '../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import {GraphQLBoolean, GraphQLFloat, GraphQLObjectType, GraphQLString} from 'graphql';
import {graphql} from 'graphql';
import NodeGraphQLSchemaGenerator from '../../graphql/node_graph_schema';

describe('A Node Schema Generator', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let transformationID: string = '';
    let nodeID: string = '';

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
            properties: {},
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

        return Promise.resolve();
    });

    after(async () => {
        await TypeTransformationMapper.Instance.DeleteHypertable(transformationID);
        await ContainerMapper.Instance.Delete(containerID);
        // for some reason this suite of tests likes to not let go of the db, so this way we don't wait for it
        void PostgresAdapter.Instance.close();

        return Promise.resolve();
    });

    it('can generate the proper schema', async () => {
        const schemaGenerator = new NodeGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForNode(nodeID, {});
        expect(schema.isError).false;

        const typeMap = schema.value.getTypeMap();
        expect(typeMap['Test']).not.undefined;

        expect((typeMap['Test'] as GraphQLObjectType).getFields()['radius'].type).eq(GraphQLFloat);
        expect((typeMap['Test'] as GraphQLObjectType).getFields()['open'].type).eq(GraphQLBoolean);
        expect((typeMap['Test'] as GraphQLObjectType).getFields()['color'].type).eq(GraphQLString);
        expect((typeMap['Test'] as GraphQLObjectType).getFields()['at'].type).eq(GraphQLString);

        return Promise.resolve();
    });

    it('can query data correctly', async () => {
        const schemaGenerator = new NodeGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForNode(nodeID, {});
        expect(schema.isError).false;

        // double-check the schema
        const typeMap = schema.value.getTypeMap();
        expect(typeMap['Test']).not.undefined;

        expect((typeMap['Test'] as GraphQLObjectType).getFields()['radius'].type).eq(GraphQLFloat);
        expect((typeMap['Test'] as GraphQLObjectType).getFields()['open'].type).eq(GraphQLBoolean);
        expect((typeMap['Test'] as GraphQLObjectType).getFields()['color'].type).eq(GraphQLString);
        expect((typeMap['Test'] as GraphQLObjectType).getFields()['at'].type).eq(GraphQLString);

        //simple query
        try {
            let results = await graphql({
                schema: schema.value,
                source: simpleQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test.length).eq(2);
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
            expect(results.data?.Test.length).eq(1);
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
            expect(results.data?.Test.length).eq(1);
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
            expect(results.data?.Test.length).eq(2);
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
            expect(results.data?.Test.length).eq(2);
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
            expect(results.data?.Test.length).eq(0);
        } catch (e: any) {
            expect.fail(e);
        }

        return Promise.resolve();
    }).timeout(300000);

    it('can save data to file correctly', async () => {
        const schemaGenerator = new NodeGraphQLSchemaGenerator();

        const schema = await schemaGenerator.ForNode(nodeID, {returnFile: true});
        expect(schema.isError).false;

        //simple query
        try {
            let results = await graphql({
                schema: schema.value,
                source: simpleFileQuery,
            });

            if (results.errors) expect.fail(results.errors.join(','));
            expect(results.data?.Test.file_size).gt(0);
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

const simpleQuery = `{
    Test {
        radius
        open
        color
        at
    }
}`;

const simpleFileQuery = `{
    Test {
        id
        file_name
        file_size
        md5hash
    }
}`;

const limitQuery = `{
    Test(_record: {limit: 1}) {
        radius
        open
        color
        at
    }
}`;

const colorQuery = `{
    Test(color: {operator: "eq", value: "blue"}) {
        radius
        open
        color
        at
    }
}`;

const colorInQuery = `{
    Test(color: {operator: "in", value: ["blue", "green"]}) {
        radius
        open
        color
        at
    }
}`;

const timeQuery = `{
    Test(at: {operator: ">", value: "2001-01-01"}) {
        radius
        open
        color
        at
    }
}`;

const reverseTimeQuery = `{
    Test(at: {operator: "<", value: "2001-01-01"}) {
        radius
        open
        color
        at
    }
}`;
