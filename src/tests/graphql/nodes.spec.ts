import Logger from '../../services/logger';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import MetatypeKeyMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import MetatypeMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import faker from 'faker';
import {expect} from 'chai';
import NodeMapper from '../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import {graphql, GraphQLSchema} from 'graphql';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../domain_objects/data_warehouse/ontology/metatype';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import MetatypeKey from '../../domain_objects/data_warehouse/ontology/metatype_key';
import Node from '../../domain_objects/data_warehouse/data/node';
import {User} from '../../domain_objects/access_management/user';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import DataSourceMapper from '../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import DataSourceRecord from '../../domain_objects/data_warehouse/import/data_source';
import MetatypeRelationshipMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRelationship from '../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipKey from '../../domain_objects/data_warehouse/ontology/metatype_relationship_key';
import MetatypeRelationshipKeyMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_key_mapper';
import MetatypeRelationshipPair from '../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeRelationshipPairMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import EdgeMapper from '../../data_access_layer/mappers/data_warehouse/data/edge_mapper';
import Edge from '../../domain_objects/data_warehouse/data/edge';
import GraphQLSchemaGenerator from '../../graphql/schema';

describe('Using a new GraphQL Query on nodes we', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let dataSourceID = '';
    let nodes: Node[] = [];
    let schema: GraphQLSchema;
    let metatypeList: Metatype[] = [];

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping graphQL node query tests, no storage layer');
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

        const nMapper = NodeMapper.Instance;
        const mkMapper = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const mrMapper = MetatypeRelationshipMapper.Instance;
        const mrKeyMapper = MetatypeRelationshipKeyMapper.Instance;
        const mrPairMapper = MetatypeRelationshipPairMapper.Instance;
        const eMapper = EdgeMapper.Instance;

        const metatypes = await mMapper.BulkCreate('test suite', [
            new Metatype({
                container_id: containerID,
                name: 'Multimeta',
                description: faker.random.alphaNumeric(),
            }),
            new Metatype({
                container_id: containerID,
                name: 'Singleton',
                description: faker.random.alphaNumeric(),
            }),
        ]);

        expect(metatypes.isError).false;
        expect(metatypes.value).not.empty;
        metatypeList = metatypes.value;

        const testKeys1 = [...test_keys];
        testKeys1.forEach((key) => (key.metatype_id = metatypes.value[0].id!));
        const keys = await mkMapper.BulkCreate('test suite', testKeys1);
        expect(keys.isError).false;

        const testKeys2 = [...test_keys];
        testKeys2.forEach((key) => (key.metatype_id = metatypes.value[1].id!));
        const keys2 = await mkMapper.BulkCreate('test suite', testKeys2);
        expect(keys2.isError).false;

        const nodeList = [
            new Node({
                container_id: containerID,
                metatype: metatypes.value[0].id!,
                properties: {
                    name: 'MultiNodeRel',
                    color: 'blue',
                    notRequired: 1234,
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            }),
            new Node({
                container_id: containerID,
                metatype: metatypes.value[0].id!,
                properties: {
                    name: 'MultiNode2',
                    color: 'red',
                    notRequired: 1234,
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            }),
            new Node({
                container_id: containerID,
                metatype: metatypes.value[0].id!,
                properties: {
                    name: 'MultiNode3',
                    color: 'red',
                    notRequired: 1234,
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            }),
            new Node({
                container_id: containerID,
                metatype: metatypes.value[1].id!,
                properties: {
                    name: 'Singleton',
                    color: 'yellow',
                    notRequired: 1234,
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            }),
        ];

        const saveNodes = await nMapper.BulkCreateOrUpdateByCompositeID('test suite', nodeList);
        expect(saveNodes.isError, metatypes.error?.error).false;
        expect(saveNodes.value.length).eq(4);

        nodes = saveNodes.value;

        const relationship = await mrMapper.Create(
            'test suite',
            new MetatypeRelationship({
                container_id: containerID,
                name: 'connected',
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        const relTestKeys = [...test_rel_keys];
        relTestKeys.forEach((key) => (key.metatype_relationship_id = relationship.value.id!));
        const rKeys = await mrKeyMapper.BulkCreate('test suite', relTestKeys);
        expect(rKeys.isError).false;

        const relPair = await mrPairMapper.Create(
            'test suite',
            new MetatypeRelationshipPair({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes.value[0].id!,
                destination_metatype: metatypes.value[1].id!,
                relationship: relationship.value.id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
        );
        expect(relPair.isError).false;
        expect(relPair.value).not.empty;
        const pair = relPair.value;

        const edge = await eMapper.Create(
            'test suite',
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pair.id!,
                properties: payload,
                origin_id: nodes[0].id,
                destination_id: nodes[3].id,
            }),
        );
        expect(edge.isError).false;

        const schemaGenerator = new GraphQLSchemaGenerator();
        GraphQLSchemaGenerator.resetSchema();

        const schemaResults = await schemaGenerator.ForContainer(containerID, {});
        expect(schemaResults.isError).false;
        expect(schemaResults.value).not.empty;
        schema = schemaResults.value;

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await DataSourceMapper.Instance.Delete(dataSourceID);
        await ContainerMapper.Instance.Delete(containerID);
        void PostgresAdapter.Instance.close();

        return Promise.resolve();
    });

    it('can query by metatype', async () => {
        // we load the schema here because we're also testing the ability for the generator to grab only what it needs
        const schemaGenerator = new GraphQLSchemaGenerator();
        GraphQLSchemaGenerator.resetSchema();

        const schemaResults = await schemaGenerator.ForContainer(containerID, {
            query: `{
                metatypes{
                    Multimeta{
                        _record{
                            id
                            metatype_uuid
                        }
                        name
                        color
                    }
                    
                    Singleton {
                        id
                    }
                }
            }`,
        });
        expect(schemaResults.isError).false;
        expect(schemaResults.value).not.empty;
        let s = schemaResults.value;

        const response = await graphql({
            schema: s,
            source: `{
                metatypes{
                    Multimeta{
                        _record{
                            id
                            metatype_uuid
                        }
                        name
                        color
                    }
                }
            }`,
        });
        expect(response.errors, response.errors?.join(',')).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.metatypes.Multimeta;
        expect(data.length).eq(3);

        for (const n of data) {
            expect(n._record.id).not.undefined;
            expect(n.name).not.undefined;
            expect(n.color).not.undefined;
            expect(n.invalidAttribute).undefined;
        }

        return Promise.resolve();
    });

    it('can query by metatype, returning nodes', async () => {
        const response = await graphql({
            schema,
            source: `{
                nodes(metatype_uuid: {operator: "eq", value: "${metatypeList[0].uuid}"}){
                    id
                    metatype_name
                    metatype_uuid
                    properties
                }
            }`,
        });
        expect(response.errors, response.errors?.join(',')).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.nodes;
        expect(data.length).eq(3);

        for (const n of data) {
            expect(n.id).not.undefined;
            expect(n.properties).not.undefined;
            expect(n.metatype_uuid).not.undefined;
            expect(n.metatype_name).eq('Multimeta');
            expect(n.invalidAttribute).undefined;
        }

        return Promise.resolve();
    });

    it('can query by metatype and filter by properties, returning nodes', async () => {
        const response = await graphql({
            schema,
            source: `{
                nodes(metatype_uuid: {operator: "eq", value: "${metatypeList[0].uuid}"},
                properties: [ 
                {key: "color", operator: "eq", value: "red"},
                {key: "name",operator: "eq",  value: "MultiNode2"}
                ]){
                    id
                    metatype_name
                    metatype_uuid
                    properties
                }
            }`,
        });
        expect(response.errors, response.errors?.join(',')).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.nodes;
        expect(data.length).eq(1);

        for (const n of data) {
            expect(n.id).not.undefined;
            expect(n.properties).not.undefined;
            expect(n.properties.color).eq('red');
            expect(n.metatype_uuid).not.undefined;
            expect(n.metatype_name).eq('Multimeta');
            expect(n.invalidAttribute).undefined;
        }

        return Promise.resolve();
    });

    it('can save a query by metatype to file', async () => {
        const schemaGenerator = new GraphQLSchemaGenerator();
        GraphQLSchemaGenerator.resetSchema();

        const schemaResults = await schemaGenerator.ForContainer(containerID, {returnFile: true});
        expect(schemaResults.isError).false;
        expect(schemaResults.value).not.empty;

        const response = await graphql({
            schema: schemaResults.value,
            source: `{
                metatypes{
                    Multimeta{
                        id
                        file_name
                        file_size
                        md5hash
                    }
                }
            }`,
        });
        expect(response.errors, response.errors?.join(',')).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.metatypes.Multimeta;
        expect(data.file_size).gt(0);

        return Promise.resolve();
    });

    it('can save a query by metatype to file as parquet', async () => {
        const schemaGenerator = new GraphQLSchemaGenerator();

        const schemaResults = await schemaGenerator.ForContainer(containerID, {
            returnFile: true,
            returnFileType: 'parquet',
            query: `{
                metatypes{
                    Multimeta{
                        id
                        file_name
                        file_size
                        md5hash
                    }
                }
            }`,
        });
        expect(schemaResults.isError).false;
        expect(schemaResults.value).not.empty;

        const response = await graphql({
            schema: schemaResults.value,
            source: `{
                metatypes{
                    Multimeta{
                        id
                        file_name
                        file_size
                        md5hash
                    }
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.metatypes.Multimeta;
        expect(data.file_size).gt(0);

        return Promise.resolve();
    });

    it('can filter by metatype property', async () => {
        const response = await graphql({
            schema,
            source: `{
                metatypes{
                    Multimeta(
                        color: {operator: "eq", value: "red"}
                    ){
                        _record{
                            id
                            metatype_uuid
                        }
                        name
                        color
                    }
                }
            }`,
        });
        expect(response.errors, response.errors?.join(',')).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.metatypes.Multimeta;
        expect(data.length).eq(2);

        for (const n of data) {
            expect(n._record.id).not.undefined;
            expect(n.name).not.undefined;
            expect(n.color).not.undefined;
            expect(n._record.metatype_uuid).not.undefined;
            expect(n.color).eq('red');
            expect(n.invalidAttribute).undefined;
        }

        return Promise.resolve();
    });

    it('can filter by record metadata', async () => {
        const response = await graphql({
            schema,
            source: `{
                metatypes{
                    Multimeta(
                        _record: {
                            id: {operator:"eq", value:  "${nodes[0].id}"}
                        }
                    ){
                        _record{
                            id
                            metatype_uuid
                        }
                        name
                        color
                    }
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.metatypes.Multimeta;
        expect(data.length).eq(1);

        for (const n of data) {
            expect(n._record.id).not.undefined;
            expect(n._record.id).eq(nodes[0].id);
            expect(n.name).not.undefined;
            expect(n.color).not.undefined;
            expect(n._record.metatype_uuid).not.undefined;
            expect(n.invalidAttribute).undefined;
        }

        return Promise.resolve();
    });

    it('can filter by multiple metatype properties', async () => {
        const response = await graphql({
            schema,
            source: `{
                metatypes{
                    Multimeta(
                        color:{operator:"eq" value: "red"},
                        name: {operator:"eq", value: "MultiNode2"}
                    ){
                        _record{
                            id
                            metatype_uuid
                        }
                        name
                        color
                    }
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.metatypes.Multimeta;
        expect(data.length).eq(1);

        for (const n of data) {
            expect(n._record.id).not.undefined;
            expect(n.name).not.undefined;
            expect(n.name).eq('MultiNode2');
            expect(n.color).not.undefined;
            expect(n.color).eq('red');
            expect(n._record.metatype_uuid).eq(metatypeList[0].uuid);
            expect(n.invalidAttribute).undefined;
        }

        return Promise.resolve();
    });

    it('can filter by relationship', async () => {
        const response = await graphql({
            schema,
            source: `{
                metatypes{
                    Multimeta(
                        _relationship: {
                            connected: {
                                Singleton: true
                            }
                        }
                    ){
                        _record{
                            id
                            metatype_uuid
                        }
                        name
                        color
                    }
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.metatypes.Multimeta;
        expect(data.length).eq(1);

        for (const n of data) {
            expect(n._record.id).not.undefined;
            expect(n._record.id).eq(nodes[0].id!);
            expect(n.name).not.undefined;
            expect(n.color).not.undefined;
            expect(n.invalidAttribute).undefined;
            expect(n._record.metatype_uuid).eq(metatypeList[0].uuid);
        }

        return Promise.resolve();
    });

    it('can save to file by relationship', async () => {
        const schemaGenerator = new GraphQLSchemaGenerator();

        const schemaResults = await schemaGenerator.ForContainer(containerID, {returnFile: true});
        expect(schemaResults.isError).false;
        expect(schemaResults.value).not.empty;

        const response = await graphql({
            schema: schemaResults.value,
            source: `{
                metatypes{
                    Multimeta(
                        _relationship: {
                            connected: {
                                Singleton: true
                            }
                        }
                    ){
                        id
                        file_name
                        file_size
                        md5hash 
                    }
                }
            }`,
        });

        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.metatypes.Multimeta;

        expect(data.file_size).gt(0);

        return Promise.resolve();
    });
});

const test_keys: MetatypeKey[] = [
    new MetatypeKey({
        name: 'Test',
        description: 'object name',
        required: true,
        property_name: 'name',
        data_type: 'string',
    }),
    new MetatypeKey({
        name: 'Test2',
        description: 'color of object',
        required: true,
        property_name: 'color',
        data_type: 'enumeration',
        options: ['yellow', 'blue', 'red'],
    }),
    new MetatypeKey({
        name: 'Test Not Required',
        description: 'not required',
        required: false,
        property_name: 'notRequired',
        data_type: 'number',
    }),
];

const payload: {[key: string]: any} = {
    name: faker.name.findName(),
    color: 'yellow',
    notRequired: 1234,
};

const test_rel_keys: MetatypeRelationshipKey[] = [
    new MetatypeRelationshipKey({
        name: 'Test',
        description: 'flower name',
        required: true,
        property_name: 'flower_name',
        data_type: 'string',
    }),
    new MetatypeRelationshipKey({
        name: 'Test2',
        description: 'color of flower allowed',
        required: true,
        property_name: 'color',
        data_type: 'enumeration',
        options: ['yellow', 'blue'],
    }),
    new MetatypeRelationshipKey({
        name: 'Test Not Required',
        description: 'not required',
        required: false,
        property_name: 'notRequired',
        data_type: 'number',
    }),
];
