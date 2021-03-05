/* tslint:disable */
import Logger from "../../logger";
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import MetatypeKeyStorage from "../../data_access_layer/mappers/metatype_key_storage";
import MetatypeStorage from "../../data_access_layer/mappers/metatype_storage";
import faker from "faker";
import {expect} from "chai";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import GraphStorage from "../../data_access_layer/mappers/graph/graph_storage";
import NodeStorage from "../../data_access_layer/mappers/graph/node_storage";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import {NodeT} from "../../types/graph/nodeT";
import {graphql} from "graphql";
import resolversRoot from "../../data_query/resolvers";
import {schema} from "../../data_query/schema"
import { MetatypeT } from "../../types/metatypeT";
import MetatypeRelationshipStorage from "../../data_access_layer/mappers/metatype_relationship_storage";
import MetatypeRelationshipKeyStorage from "../../data_access_layer/mappers/metatype_relationship_key_storage";
import MetatypeRelationshipPairStorage from "../../data_access_layer/mappers/metatype_relationship_pair_storage";
import EdgeStorage from "../../data_access_layer/mappers/graph/edge_storage";
import {MetatypeRelationshipKeyT} from "../../types/metatype_relationship_keyT";
import {EdgeT} from "../../types/graph/edgeT";
import Container from "../../data_warehouse/ontology/container";

describe('Using a GraphQL Query for a nodes edges', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";
    var node: NodeT
    var edge: EdgeT
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

        const edgeStorage = EdgeStorage.Instance
        const nodeStorage = NodeStorage.Instance;
        const kStorage = MetatypeKeyStorage.Instance;
        const mStorage = MetatypeStorage.Instance;
        const gStorage = GraphStorage.Instance;
        const rStorage = MetatypeRelationshipStorage.Instance;
        const rkStorage = MetatypeRelationshipKeyStorage.Instance;
        const rpStorage = MetatypeRelationshipPairStorage.Instance;

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

        let relationship = await rStorage.Create(containerID, "test suite",
            {"name": "parent", "description": faker.random.alphaNumeric()});

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        const rkeys = await rkStorage.Create(relationship.value[0].id!, "test suite", test_relationship_keys)

        let pair = await rpStorage.Create(containerID, "test suite", {
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype_id": metatype.id,
            "destination_metatype_id": metatype.id,
            "relationship_id": relationship.value[0].id,
            "relationship_type": "one:one"
        });

        // EDGE SETUP
        let edges = await edgeStorage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value[0].id,
            properties: payload,
            origin_node_id: node.id,
            destination_node_id: node.id
        });

        expect(edges.isError).false;

        edge = edges.value[0]

        return Promise.resolve()
    });

    it('can query by id, with all edge resolvers functioning', async()=> {
        let response = await graphql(schema, `{
            nodes(nodeID: "${node.id}") {
                id
                incoming_edges {id}
                outgoing_edges {id}
            }
        }`, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            expect(n.id).not.undefined

            // both incoming and outgoing are filled because the same node
            // is the origin and destination
            expect(Array.isArray(n.incoming_edges)).true
            expect(n.incoming_edges.length).eq(1)

            expect(Array.isArray(n.outgoing_edges)).true
            expect(n.outgoing_edges.length).eq(1)
        }

    });

    it('can filter edges by properties', async()=> {
        let response = await graphql(schema, `{
            nodes(nodeID: "${node.id}") {
                incoming_edges(where: {
                AND: [
                    {properties: [
                    {key: "flower" value:"Daisy" operator:"eq"}
                    ]}
                    ]
            }) {id}
            }
        }`, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            // both incoming and outgoing are filled because the same node
            // is the origin and destination
            expect(Array.isArray(n.incoming_edges)).true
            expect(n.incoming_edges.length).eq(1)
        }

    });


    it('can filter edges by relationship name', async()=> {
        let response = await graphql(schema, `{
            nodes(nodeID: "${node.id}") {
                incoming_edges(where: {
                AND: [
                    {relationship_name: "eq parent" }
                    ]
            }) {id}
            }
        }`, resolversRoot(containerID))

        expect(response.errors).undefined
        expect(response.data).not.undefined

        expect(response.data!.nodes.length).eq(1)

        for(const n of response.data!.nodes) {
            // both incoming and outgoing are filled because the same node
            // is the origin and destination
            expect(Array.isArray(n.incoming_edges)).true
            expect(n.incoming_edges.length).eq(1)
        }

    });
});

const payload: {[key:string]:any} = {
    "flower": "Daisy",
    "color": "yellow",
    "notRequired": 1,
    "nested": {
        "nested1": "nested1 value"
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
const test_relationship_keys: MetatypeRelationshipKeyT[] = [{
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
