import Logger from '../../../../services/logger';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import MetatypeKeyMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import MetatypeMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import faker from 'faker';
import {expect} from 'chai';
import NodeMapper from '../../../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import {graphql} from 'graphql';
import resolversRoot from '../../../../http_server/routes/data_warehouse/data/legacy_query/resolvers';
import {schema} from '../../../../http_server/routes/data_warehouse/data/legacy_query/schema';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import MetatypeKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import Node from '../../../../domain_objects/data_warehouse/data/node';

describe('Using a legacy GraphQL Query on nodes we', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let node: Node;
    let metatype: Metatype;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping nodes graph tests, no storage layer');
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

        const nodeStorage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;

        const metatypeResult = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatypeResult.isError).false;
        expect(metatypeResult.value).not.empty;
        metatype = metatypeResult.value;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatypeResult.value.id!));
        const keys = await kStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const mixed = new Node({
            container_id: containerID,
            metatype: metatypeResult.value.id!,
            properties: payload,
        });

        const nodes = await nodeStorage.CreateOrUpdateByCompositeID('test suite', mixed);
        expect(nodes.isError, metatypeResult.error?.error).false;

        node = nodes.value;

        return Promise.resolve();
    });

    after(async () => {
        return ContainerMapper.Instance.Delete(containerID);
    });

    it('can query by id, with all resolvers functioning', async () => {
        const response = await graphql(
            schema,
            `{
            nodes(nodeID: "${node.id}") {
                id
                metatype { id name description}
                properties {key value type}
                raw_properties
                container_id
                original_data_id
                data_source_id
                created_at
                modified_at
                import_data_id
                incoming_edges {id}
                outgoing_edges {id}
            }
        }`,
            resolversRoot(containerID),
        );

        expect(response.errors).undefined;
        expect(response.data).not.undefined;

        expect(response.data!.nodes.length).eq(1);

        for (const n of response.data!.nodes) {
            expect(n.id).not.undefined;

            expect(n.metatype).not.undefined;
            expect(n.metatype.id).not.undefined;
            expect(n.metatype.name).not.undefined;
            expect(n.metatype.description).not.undefined;

            expect(n.properties).not.undefined;
            expect(Array.isArray(n.properties)).true;
            expect(n.raw_properties).not.undefined;
            expect(n.container_id).not.undefined;
            expect(n.original_data_id).not.undefined;
            expect(n.data_source_id).not.undefined;
            expect(n.created_at).not.undefined;
            expect(n.modified_at).not.undefined;

            expect(Array.isArray(n.incoming_edges)).true;
            expect(Array.isArray(n.outgoing_edges)).true;
        }
    });

    it('can pass in a limit and offset parameter ', async () => {
        const response = await graphql(
            schema,
            `
                {
                    nodes(limit: 1, offset: 0) {
                        id
                    }
                }
            `,
            resolversRoot(containerID),
        );

        expect(response.errors).undefined;
        expect(response.data).not.undefined;

        expect(response.data!.nodes.length).eq(1);

        for (const n of response.data!.nodes) {
            expect(n.id).not.undefined;
        }
    });

    it('can include a filter on metatype name, id', async () => {
        let response = await graphql(
            schema,
            `{
            nodes(where: {AND: [{metatype_name: "eq ${metatype.name}"}]}) {
                metatype { id name description}
            }
        }`,
            resolversRoot(containerID),
        );

        expect(response.errors).undefined;
        expect(response.data).not.undefined;

        expect(response.data!.nodes.length).eq(1);

        for (const n of response.data!.nodes) {
            expect(n.metatype).not.undefined;
            expect(n.metatype.id).not.undefined;
            expect(n.metatype.name).not.undefined;
            expect(n.metatype.description).not.undefined;
        }

        response = await graphql(
            schema,
            `{
            nodes(where: {AND: [{metatype_id: "eq ${metatype.id}"}]}) {
                metatype { id name description}
            }
        }`,
            resolversRoot(containerID),
        );

        expect(response.errors).undefined;
        expect(response.data).not.undefined;

        expect(response.data!.nodes.length).eq(1);

        for (const n of response.data!.nodes) {
            expect(n.metatype).not.undefined;
            expect(n.metatype.id).not.undefined;
            expect(n.metatype.name).not.undefined;
            expect(n.metatype.description).not.undefined;
        }
    });

    it('can include a filter on id, with IN functionality', async () => {
        let response = await graphql(
            schema,
            `{
            nodes(where: {AND: [{metatype_name: "eq ${metatype.name}"}]}) {
                metatype { id name description}
            }
        }`,
            resolversRoot(containerID),
        );

        expect(response.errors).undefined;
        expect(response.data).not.undefined;

        expect(response.data!.nodes.length).eq(1);

        for (const n of response.data!.nodes) {
            expect(n.metatype).not.undefined;
            expect(n.metatype.id).not.undefined;
            expect(n.metatype.name).not.undefined;
            expect(n.metatype.description).not.undefined;
        }

        response = await graphql(
            schema,
            `{
            nodes(where: {AND: [{id: "in ${node.id}"}]}) {
                id
            }
        }`,
            resolversRoot(containerID),
        );

        expect(response.errors).undefined;
        expect(response.data).not.undefined;

        expect(response.data!.nodes.length).eq(1);
    });

    it('can include a filter on properties', async () => {
        let response = await graphql(
            schema,
            `
                {
                    nodes(where: {AND: [{properties: [{key: "flower_name", value: "Daisy", operator: "eq"}]}]}) {
                        id
                    }
                }
            `,
            resolversRoot(containerID),
        );

        expect(response.errors).undefined;
        expect(response.data).not.undefined;

        expect(response.data!.nodes.length).eq(1);

        for (const n of response.data!.nodes) {
            expect(n.id).not.undefined;
        }

        // test Postgres Pattern matching
        response = await graphql(
            schema,
            `
                {
                    nodes(where: {AND: [{properties: [{key: "flower_name", value: "Dais%", operator: "like"}]}]}) {
                        id
                    }
                }
            `,
            resolversRoot(containerID),
        );

        expect(response.errors).undefined;
        expect(response.data).not.undefined;

        expect(response.data!.nodes.length).eq(1);

        for (const n of response.data!.nodes) {
            expect(n.id).not.undefined;
        }
    });

    it('can include a filter on nested properties', async () => {
        let response = await graphql(
            schema,
            `
                {
                    nodes(where: {AND: [{properties: [{key: "nested.nested1", value: "nested1 value", operator: "eq"}]}]}) {
                        id
                    }
                }
            `,
            resolversRoot(containerID),
        );

        expect(response.errors).undefined;
        expect(response.data).not.undefined;

        expect(response.data!.nodes.length).eq(1);

        for (const n of response.data!.nodes) {
            expect(n.id).not.undefined;
        }

        // deeply nested key matching
        response = await graphql(
            schema,
            `
                {
                    nodes(where: {AND: [{properties: [{key: "nested.nested2.nested2", value: "nested2 value", operator: "eq"}]}]}) {
                        id
                    }
                }
            `,
            resolversRoot(containerID),
        );

        expect(response.errors).undefined;
        expect(response.data).not.undefined;

        expect(response.data!.nodes.length).eq(1);

        for (const n of response.data!.nodes) {
            expect(n.id).not.undefined;
        }
    });
});

const payload: {[key: string]: any} = {
    flower_name: 'Daisy',
    color: 'yellow',
    notRequired: 1,
    nested: {
        nested1: 'nested1 value',
        nested2: {nested2: 'nested2 value'},
    },
};

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({
        name: 'Test',
        description: 'flower name',
        required: true,
        property_name: 'flower_name',
        data_type: 'string',
    }),
    new MetatypeKey({
        name: 'Test2',
        description: 'color of flower allowed',
        required: true,
        property_name: 'color',
        data_type: 'enumeration',
        options: ['yellow', 'blue'],
    }),
    new MetatypeKey({
        name: 'Test Not Required',
        description: 'not required',
        required: false,
        property_name: 'notRequired',
        data_type: 'number',
    }),
];

export const single_test_key: MetatypeKey = new MetatypeKey({
    name: 'Test Not Required',
    description: 'not required',
    required: false,
    property_name: 'notRequired',
    data_type: 'number',
});
