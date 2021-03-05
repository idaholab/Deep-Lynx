/* tslint:disable */
import Logger from "../../logger";
import PostgresAdapter from "../../data_mappers/adapters/postgres/postgres";
import MetatypeKeyStorage from "../../data_mappers/metatype_key_storage";
import MetatypeStorage from "../../data_mappers/metatype_storage";
import faker from "faker";
import {expect} from "chai";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import GraphStorage from "../../data_mappers/graph/graph_storage";
import NodeStorage from "../../data_mappers/graph/node_storage";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import {NodeT} from "../../types/graph/nodeT";
import {graphql} from "graphql";
import resolversRoot from "../../data_query/resolvers";
import {schema} from "../../data_query/schema"
import { MetatypeT } from "../../types/metatypeT";
import Container from "../../data_warehouse/ontology/container";

describe('Using a GraphQL Query on nodes we', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";
    var node: NodeT
    var metatype: MetatypeT

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping nodes graph tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init();
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container(faker.name.findName(), faker.random.alphaNumeric()));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        const nodeStorage = NodeStorage.Instance;
        const kStorage = MetatypeKeyStorage.Instance;
        const mStorage = MetatypeStorage.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatypeResult = await mStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatypeResult.isError).false;
        expect(metatypeResult.value).not.empty;
        metatype = metatypeResult.value[0]

        const keys = await kStorage.Create(metatypeResult.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatypeResult.value[0].id!,
            properties: payload
        };

        const nodes = await nodeStorage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(nodes.isError, metatypeResult.error?.error).false;

        node = nodes.value[0]

        return Promise.resolve()
    });

    it('can query by id, with all resolvers functioning', async()=> {
        let response = await graphql(schema, `{
            nodes(nodeID: "${node.id}") {
                id
                metatype { id name description}
                properties {key value type}
                raw_properties 
                container_id
                original_data_id
                data_source_id
                archived
                created_at
                modified_at
                graph
                import_data_id
                incoming_edges {id}
                outgoing_edges {id}
            }
        }`, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            expect(n.id).not.undefined

            expect(n.metatype).not.undefined
            expect(n.metatype.id).not.undefined
            expect(n.metatype.name).not.undefined
            expect(n.metatype.description).not.undefined

            expect(n.properties).not.undefined
            expect(Array.isArray(n.properties)).true
            expect(n.raw_properties).not.undefined
            expect(n.container_id).not.undefined
            expect(n.original_data_id).not.undefined
            expect(n.data_source_id).not.undefined
            expect(n.archived).not.undefined
            expect(n.created_at).not.undefined
            expect(n.modified_at).not.undefined
            expect(n.graph).not.undefined

            expect(Array.isArray(n.incoming_edges)).true
            expect(Array.isArray(n.outgoing_edges)).true
        }

    });

    it('can pass in a limit and offset parameter ', async()=> {
        let response = await graphql(schema, `{
            nodes(limit: 1 offset: 0) {
                id
            }
        }`, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            expect(n.id).not.undefined
        }

    });

    it('can include a filter on metatype name, id', async()=> {
        let response = await graphql(schema, `{
            nodes(where: {AND: [{metatype_name: "eq ${metatype.name}"}]}) {
                metatype { id name description}
            }
        }`, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            expect(n.metatype).not.undefined
            expect(n.metatype.id).not.undefined
            expect(n.metatype.name).not.undefined
            expect(n.metatype.description).not.undefined
        }

        response = await graphql(schema, `{
            nodes(where: {AND: [{metatype_id: "eq ${metatype.id}"}]}) {
                metatype { id name description}
            }
        }`, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            expect(n.metatype).not.undefined
            expect(n.metatype.id).not.undefined
            expect(n.metatype.name).not.undefined
            expect(n.metatype.description).not.undefined
        }

    });

    it('can include a filter on id, with IN functionality', async()=> {
        let response = await graphql(schema, `{
            nodes(where: {AND: [{metatype_name: "eq ${metatype.name}"}]}) {
                metatype { id name description}
            }
        }`, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            expect(n.metatype).not.undefined
            expect(n.metatype.id).not.undefined
            expect(n.metatype.name).not.undefined
            expect(n.metatype.description).not.undefined
        }

        response = await graphql(schema, `{
            nodes(where: {AND: [{id: "in ${node.id}"}]}) {
                id
            }
        }`, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)
    });

    it('can include a filter on properties', async()=> {
        let response = await graphql(schema, `
        {
            nodes(where: {
                AND: [
                    {properties: [
                    {key: "flower" value:"Daisy" operator:"eq"}
                    ]}
                    ]
            }) {
                id
            }
        }
        `, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            expect(n.id).not.undefined
        }

        // test Postgres Pattern matching
        response = await graphql(schema, `
        {
            nodes(where: {
                AND: [
                    {properties: [
                    {key: "flower" value:"Dais%" operator:"like"}
                    ]}
                    ]
            }) {
                id
            }
        }
        `, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            expect(n.id).not.undefined
        }
    });

    it('can include a filter on nested properties', async()=> {
        let response = await graphql(schema, `
        {
            nodes(where: {
                AND: [
                    {properties: [
                    {key: "nested.nested1" value:"nested1 value" operator:"eq"}
                    ]}
                    ]
            }) {
                id
            }
        }
        `, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            expect(n.id).not.undefined
        }

        // deeply nested key matching
        response = await graphql(schema, `
        {
            nodes(where: {
                AND: [
                    {properties: [
                    {key: "nested.nested2.nested2" value:"nested2 value" operator:"eq"}
                    ]}
                    ]
            }) {
                id
            }
        }
        `, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            expect(n.id).not.undefined
        }
    });

});

const payload: {[key:string]:any} = {
    "flower": "Daisy",
    "color": "yellow",
    "notRequired": 1,
    "nested": {
        "nested1": "nested1 value",
        "nested2": {"nested2": "nested2 value"}
    }
};

const test_keys: MetatypeKeyT[] = [{
    name: "Test",
    property_name: "flower",
    required: true,
    description: "flower name",
    data_type: "string"
},
    {
        name: "Test 2",
        property_name: "color",
        required: true,
        description: "color of flower allowed",
        data_type: "enumeration",
        options: ["yellow", "blue"]
    },
    {
        name: "Test Not Required",
        property_name: "notRequired",
        required: false,
        description: "not required",
        data_type: "number",
    },
];

export const single_test_key: MetatypeKeyT = {
    name: "Test Not Required",
    property_name: "notRequired",
    required: false,
    description: "not required",
    data_type: "number",
};
