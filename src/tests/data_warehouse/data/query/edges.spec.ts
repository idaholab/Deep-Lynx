/* tslint:disable */
import Logger from "../../../../services/logger";
import PostgresAdapter from "../../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import MetatypeKeyMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import MetatypeMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import faker from "faker";
import {expect} from "chai";
import GraphMapper from "../../../../data_access_layer/mappers/data_warehouse/data/graph_mapper";
import NodeMapper from "../../../../data_access_layer/mappers/data_warehouse/data/node_mapper";
import ContainerStorage from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import {graphql} from "graphql";
import resolversRoot from "../../../../data_warehouse/data/query/resolvers";
import {schema} from "../../../../data_warehouse/data/query/schema"
import MetatypeRelationshipMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper";
import MetatypeRelationshipKeyMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_key_mapper";
import MetatypeRelationshipPairMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper";
import EdgeMapper from "../../../../data_access_layer/mappers/data_warehouse/data/edge_mapper";
import Container from "../../../../data_warehouse/ontology/container";
import Metatype from "../../../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import MetatypeRelationship from "../../../../data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipPair from "../../../../data_warehouse/ontology/metatype_relationship_pair";
import MetatypeKey from "../../../../data_warehouse/ontology/metatype_key";
import MetatypeRelationshipKey from "../../../../data_warehouse/ontology/metatype_relationship_key";
import Node from "../../../../data_warehouse/data/node"
import Edge from "../../../../data_warehouse/data/edge";

describe('Using a GraphQL Query for a nodes edges', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";
    var node: Node
    var edge: Edge
    var metatype: Metatype

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping nodes graph tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init();
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        const edgeStorage = EdgeMapper.Instance
        const nodeStorage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphMapper.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rkStorage = MetatypeRelationshipKeyMapper.Instance;
        const rpStorage = MetatypeRelationshipPairMapper.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatypeResult = await mMapper.Create("test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatypeResult.isError).false;
        expect(metatypeResult.value).not.empty;
        metatype = metatypeResult.value

        const testKeys = [...test_keys]

        testKeys.forEach(key => key.metatype_id = metatypeResult.value.id!)

        const keys = await kStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const mixed = new Node({
            metatype: metatypeResult.value.id!,
            properties: payload,
            container_id: containerID,
            graph_id: graph.value.id!
        });

        const nodes = await nodeStorage.CreateOrUpdateByCompositeID("test suite",  mixed);
        expect(nodes.isError, metatypeResult.error?.error).false;

        node = nodes.value

        let relationship = await rMapper.Create("test suite", new MetatypeRelationship({container_id: containerID, name: "parent", description: faker.random.alphaNumeric()}))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        const relationshipKeys = [...test_relationship_keys]

        relationshipKeys.forEach(key => key.metatype_relationship_id = relationship.value.id!)

        const rkeys = await rkStorage.BulkCreate("test suite", relationshipKeys)
        expect(rkeys.isError).false

        let pair = await rpStorage.Create("test suite", new MetatypeRelationshipPair({
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype": metatype.id!,
            "destination_metatype": metatype.id!,
            "relationship": relationship.value.id!,
            "relationship_type": "one:one",
            container_id: containerID
        }));

        // EDGE SETUP
        let edges = await edgeStorage.CreateOrUpdateByCompositeID("test suite", new Edge({
            container_id: containerID,
            graph_id: graph.value.id!,
            metatype_relationship_pair: pair.value.id!,
            properties: payload,
            origin_node_id: node.id,
            destination_node_id: node.id
        }));

        expect(edges.isError).false;

        edge = edges.value

        return Promise.resolve()
    });

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })

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
    "flower_name": "Daisy",
    "color": "yellow",
    "notRequired": 1,
    "nested": {
        "nested1": "nested1 value"
    }
};

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({name: "Test", description: "flower name", required: true, property_name: "flower_name", data_type: "string"}),
    new MetatypeKey({name: "Test2", description: "color of flower allowed", required: true, property_name: "color", data_type: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeKey({name: "Test Not Required", description: "not required", required: false, property_name: "notRequired", data_type: "number"}),
];

export const single_test_key: MetatypeKey = new MetatypeKey({name: "Test Not Required", description: "not required", required: false, property_name: "notRequired", data_type: "number"})

export const test_relationship_keys: MetatypeRelationshipKey[] = [
    new MetatypeRelationshipKey({name: "Test", description: "flower name", required: true, property_name: "flower_name", data_type: "string"}),
    new MetatypeRelationshipKey({name: "Test2", description: "color of flower allowed", required: true, property_name: "color", data_type: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeRelationshipKey({name: "Test Not Required", description: "not required", required: false, property_name: "notRequired", data_type: "number"}),
];
