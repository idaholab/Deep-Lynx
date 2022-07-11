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

describe('Using a new GraphQL Query on edges we', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let dataSourceID = '';
    let nodes: Node[] = [];
    let schema: GraphQLSchema;

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
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        ]);

        expect(metatypes.isError).false;
        expect(metatypes.value).not.empty;
        expect(metatypes.value.length).eq(4);

        metatypes.value.forEach(async (mt) => {
            const testKeys = [...test_keys];
            testKeys.forEach((key) => (key.metatype_id = mt.id));
            const keys = await mkMapper.BulkCreate('test suite', testKeys);
            expect(keys.isError).false;
        });

        const nodeList = [
            new Node({
                container_id: containerID,
                metatype: metatypes.value[0].id!,
                properties: payload,
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            }),
            new Node({
                container_id: containerID,
                metatype: metatypes.value[1].id!,
                properties: payload,
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            }),
            new Node({
                container_id: containerID,
                metatype: metatypes.value[2].id!,
                properties: payload,
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            }),
            new Node({
                container_id: containerID,
                metatype: metatypes.value[3].id!,
                properties: payload,
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            }),
        ];

        const nodeResults = await nMapper.BulkCreateOrUpdateByCompositeID('test suite', nodeList);
        expect(nodeResults.isError, metatypes.error?.error).false;
        expect(nodeResults.value.length).eq(4);
        nodes = nodeResults.value;

        const relList = [
            new MetatypeRelationship({
                container_id: containerID,
                name: 'forwards',
                description: faker.random.alphaNumeric(),
            }),
            new MetatypeRelationship({
                container_id: containerID,
                name: 'backwards',
                description: faker.random.alphaNumeric(),
            }),
            new MetatypeRelationship({
                container_id: containerID,
                name: 'toSelf',
                description: faker.random.alphaNumeric(),
            }),
        ];

        const relationships = await mrMapper.BulkCreate('test suite', relList);
        expect(relationships.isError).false;
        expect(relationships.value).not.empty;
        expect(relationships.value.length).eq(3);

        relationships.value.forEach(async (rel) => {
            const testKeys = [...test_rel_keys];
            testKeys.forEach((key) => (key.metatype_relationship_id = rel.id));
            const rKeys = await mrKeyMapper.BulkCreate('test suite', testKeys);
            expect(rKeys.isError).false;
        });

        const relPairList = [
            new MetatypeRelationshipPair({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes.value[0].id!,
                destination_metatype: metatypes.value[1].id!,
                relationship: relationships.value[0].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes.value[0].id!,
                destination_metatype: metatypes.value[2].id!,
                relationship: relationships.value[0].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes.value[0].id!,
                destination_metatype: metatypes.value[3].id!,
                relationship: relationships.value[0].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes.value[1].id!,
                destination_metatype: metatypes.value[3].id!,
                relationship: relationships.value[0].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes.value[1].id!,
                destination_metatype: metatypes.value[0].id!,
                relationship: relationships.value[1].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes.value[2].id!,
                destination_metatype: metatypes.value[0].id!,
                relationship: relationships.value[1].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes.value[1].id!,
                destination_metatype: metatypes.value[1].id!,
                relationship: relationships.value[2].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
        ];

        const relPairs = await mrPairMapper.BulkCreate('test suite', relPairList);
        expect(relPairs.isError).false;
        expect(relPairs.value).not.empty;
        expect(relPairs.value.length).eq(7);
        const pairs = relPairs.value;

        const edgeList = [
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[0].id!,
                properties: {
                    name: faker.name.findName(),
                    color: 'blue',
                },
                origin_id: nodes[0].id,
                destination_id: nodes[1].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[1].id!,
                properties: {
                    name: faker.name.findName(),
                    color: 'blue',
                },
                origin_id: nodes[0].id,
                destination_id: nodes[2].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[2].id!,
                properties: {
                    name: faker.name.findName(),
                    color: 'blue',
                },
                origin_id: nodes[0].id,
                destination_id: nodes[3].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[3].id!,
                properties: {
                    name: 'Timbo Crooks Jr.',
                    color: 'blue',
                },
                origin_id: nodes[1].id,
                destination_id: nodes[3].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[4].id!,
                properties: {
                    name: faker.name.findName(),
                    color: 'blue',
                },
                origin_id: nodes[1].id,
                destination_id: nodes[0].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[5].id!,
                properties: {
                    name: faker.name.findName(),
                    color: 'blue',
                },
                origin_id: nodes[2].id,
                destination_id: nodes[0].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[6].id!,
                properties: {
                    name: faker.name.findName(),
                    color: 'blue',
                },
                origin_id: nodes[1].id,
                destination_id: nodes[1].id,
            }),
        ];
        const edgeResults = await eMapper.BulkCreate('test suite', edgeList);
        expect(edgeResults.isError).false;
        expect(relPairs.value).not.empty;
        expect(edgeResults.value.length).eq(7);

        const schemaGenerator = new GraphQLSchemaGenerator();

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

    it('can query by relationship', async () => {
        const response = await graphql({
            schema,
            source: `{
                relationships{
                    forwards{
                        name
                        _record{
                            origin_id
                            destination_id
                        }
                    }
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.relationships.forwards;
        expect(data.length).eq(4);

        for (const e of data) {
            expect(e._record.origin_id).not.undefined;
            expect(e._record.destination_id).not.undefined;
            expect(e.name).not.undefined;
            expect(e.invalidAttribute).undefined;
        }

        return Promise.resolve();
    });

    it('can save by relationship to file', async () => {
        const schemaGenerator = new GraphQLSchemaGenerator();

        const schemaResults = await schemaGenerator.ForContainer(containerID, {returnFile: true});
        expect(schemaResults.isError).false;
        expect(schemaResults.value).not.empty;

        const response = await graphql({
            schema: schemaResults.value,
            source: `{
                relationships{
                    forwards{
                       file_size 
                    }
                }
            }`,
        });
        expect(response.errors, response.errors?.join(',')).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.relationships.forwards;
        expect(data.file_size).gt(0);

        return Promise.resolve();
    });

    it('can filter by edge properties', async () => {
        const response = await graphql({
            schema,
            source: `{
                relationships{
                    forwards(
                        name: {operator: "eq", value: "Timbo Crooks Jr."}
                    ){
                        name
                        _record{
                            origin_id
                            destination_id
                        }
                    }
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.relationships.forwards;
        expect(data.length).eq(1);

        for (const e of data) {
            expect(e._record.origin_id).not.undefined;
            expect(e._record.destination_id).not.undefined;
            expect(e.name).not.undefined;
            expect(e.name).eq('Timbo Crooks Jr.');
            expect(e.invalidAttribute).undefined;
        }

        return Promise.resolve();
    });

    it('can filter by edge record metadata', async () => {
        const response = await graphql({
            schema,
            source: `{
                relationships{
                    forwards(
                        _record: {
                            destination_id: {operator: "eq", value: "${nodes[3].id}"}
                        }
                    ){
                        name
                        _record{
                            origin_id
                            destination_id
                        }
                    }
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.relationships.forwards;
        expect(data.length).eq(2);

        for (const e of data) {
            expect(e._record.origin_id).not.undefined;
            expect(e._record.destination_id).not.undefined;
            expect(e._record.destination_id).eq(nodes[3].id);
            expect(e.name).not.undefined;
            expect(e.invalidAttribute).undefined;
        }

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
        description: 'name of object',
        required: true,
        property_name: 'name',
        data_type: 'string',
    }),
    new MetatypeRelationshipKey({
        name: 'Test2',
        description: 'color of object',
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
