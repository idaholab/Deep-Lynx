/* tslint:disable */
import Logger from "../../logger";
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import MetatypeKeyStorage from "../../data_storage/metatype_key_storage";
import MetatypeStorage from "../../data_storage/metatype_storage";
import faker from "faker";
import {expect} from "chai";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import GraphStorage from "../../data_storage/graph/graph_storage";
import NodeStorage from "../../data_storage/graph/node_storage";
import ContainerStorage from "../../data_storage/container_storage";
import {MetatypeRelationshipKeyT} from "../../types/metatype_relationship_keyT";
import MetatypeRelationshipStorage from "../../data_storage/metatype_relationship_storage";
import MetatypeRelationshipPairStorage from "../../data_storage/metatype_relationship_pair_storage";
import EdgeStorage from "../../data_storage/graph/edge_storage";

// This is both test and utility for creating a full realized, semi-complex
// graphs. As such this test _does not_ delete its data after running
describe('A Complex Graph can be created', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping nodes graph tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init();
        let storage = ContainerStorage.Instance;

        let container = await storage.Create( "test suite", {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value[0].id!;

        return Promise.resolve()
    });



    it('can be created', async()=> {
        const storage = EdgeStorage.Instance;
        const nStorage = NodeStorage.Instance;
        const kStorage = MetatypeKeyStorage.Instance;
        const mStorage = MetatypeStorage.Instance;
        const gStorage = GraphStorage.Instance;
        const rStorage = MetatypeRelationshipStorage.Instance;
        const rpStorage = MetatypeRelationshipPairStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mStorage.Create(containerID, "test suite",
            [
                {"name": faker.name.findName(), "description": faker.random.alphaNumeric()},
                {"name": faker.name.findName(), "description": faker.random.alphaNumeric()},
                ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        const keys2 = await kStorage.Create(metatype.value[1].id!, "test suite", test_keys);
        expect(keys2.isError).false;

        const mixed = [{
                metatype_id: metatype.value[0].id!,
                properties: payload
        },{
            metatype_id: metatype.value[1].id!,
            properties: payload
        },
            {
                metatype_id: metatype.value[0].id!,
                properties: payload
            },{
                metatype_id: metatype.value[1].id!,
                properties: payload
            },
            {
                metatype_id: metatype.value[0].id!,
                properties: payload
            },{
                metatype_id: metatype.value[1].id!,
                properties: payload
            },
            {
                metatype_id: metatype.value[0].id!,
                properties: payload
            },{
                metatype_id: metatype.value[1].id!,
                properties: payload
            }
        ];


        const nodePair = await nStorage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(nodePair.isError, nodePair.error?.error).false;


        let relationship = await rStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create(containerID, "test suite", {
            "name": faker.random.alphaNumeric(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype_id": metatype.value[0].id,
            "destination_metatype_id": metatype.value[1].id,
            "relationship_id": relationship.value[0].id,
            "relationship_type": "many:many"
        });

        let pair2 = await rpStorage.Create(containerID, "test suite", {
            "name": faker.random.alphaNumeric(),
            "description": faker.random.alphaNumeric(),
            "destination_metatype_id": metatype.value[0].id,
            "origin_metatype_id": metatype.value[1].id,
            "relationship_id": relationship.value[0].id,
            "relationship_type": "many:many"
        });

        expect(pair2.isError).false

       // EDGE SETUP
        let edge1 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value[0].id,
            properties: payload,
            origin_node_id: nodePair.value[0].id,
            destination_node_id: nodePair.value[1].id
        });

        expect(edge1.isError, "edge 1").false;

        let edge2 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value[0].id,
            properties: payload,
            origin_node_id: nodePair.value[0].id,
            destination_node_id: nodePair.value[5].id
        });

        expect(edge2.isError, "edge 2").false;

        let edge3 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair2.value[0].id,
            properties: payload,
            origin_node_id: nodePair.value[5].id,
            destination_node_id: nodePair.value[0].id
        });

        expect(edge3.isError, "edge 3").false;

        let edge4 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair2.value[0].id,
            properties: payload,
            origin_node_id: nodePair.value[5].id,
            destination_node_id: nodePair.value[6].id
        });

        expect(edge4.isError, "edge 4").false;

        let edge5 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair2.value[0].id,
            properties: payload,
            origin_node_id: nodePair.value[1].id,
            destination_node_id: nodePair.value[4].id
        });

        expect(edge5.isError, "edge 5").false;

        let edge6 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair2.value[0].id,
            properties: payload,
            origin_node_id: nodePair.value[1].id,
            destination_node_id: nodePair.value[6].id
        });

        expect(edge6.isError, "edge 6").false;

        let edge7 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value[0].id,
            properties: payload,
            origin_node_id: nodePair.value[4].id,
            destination_node_id: nodePair.value[5].id
        });

        expect(edge7.isError, "edge 7").false;


        let edge8 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair2.value[0].id,
            properties: payload,
            origin_node_id: nodePair.value[7].id,
            destination_node_id: nodePair.value[0].id
        });

        expect(edge8.isError, "edge 8").false;

        console.log(`Graph ID = ${graph.value.id}`)

       return new Promise(resolve => resolve("all done"))
    });
});

const payload: {[key:string]:any} = {
    "flower": "Daisy",
    "color": "yellow",
    "notRequired": 1
};

const updatePayload : {[key:string]:any} = {
    "flower": "Violet",
    "color": "blue",
    "notRequired": 1
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
