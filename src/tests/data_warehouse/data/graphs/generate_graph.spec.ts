/* tslint:disable */
import Logger from "../../../../services/logger";
import PostgresAdapter from "../../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import MetatypeKeyMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import MetatypeMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import faker from "faker";
import {expect} from "chai";
import GraphStorage from "../../../../data_access_layer/mappers/data_warehouse/data/graph_storage";
import NodeStorage from "../../../../data_access_layer/mappers/data_warehouse/data/node_storage";
import ContainerStorage from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import MetatypeRelationshipMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper";
import MetatypeRelationshipPairMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper";
import EdgeStorage from "../../../../data_access_layer/mappers/data_warehouse/data/edge_storage";
import Container from "../../../../data_warehouse/ontology/container";
import Metatype from "../../../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import MetatypeRelationship from "../../../../data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipPair from "../../../../data_warehouse/ontology/metatype_relationship_pair";
import MetatypeKey from "../../../../data_warehouse/ontology/metatype_key";

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
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;
        return Promise.resolve()
    });


    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })


    it('can be created', async()=> {
        const storage = EdgeStorage.Instance;
        const nStorage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rpStorage = MetatypeRelationshipPairMapper.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mMapper.BulkCreate( "test suite",
            [
                new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
                new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
                ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys1 = [...test_keys]
        testKeys1.forEach(key => key.metatype_id = metatype.value[0].id)
        const keys = await kStorage.BulkCreate("test suite", testKeys1);
        expect(keys.isError).false;

        const testKeys2 = [...test_keys]
        testKeys2.forEach(key => key.metatype_id = metatype.value[1].id)
        const keys2 = await kStorage.BulkCreate("test suite", testKeys2);
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


        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship({containerID, name: faker.name.findName(), description:faker.random.alphaNumeric()}))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create("test suite", new MetatypeRelationshipPair({
            "name": faker.random.alphaNumeric(),
            "description": faker.random.alphaNumeric(),
            "originMetatype": metatype.value[0].id!,
            "destinationMetatype": metatype.value[1].id!,
            "relationship": relationship.value.id!,
            "relationshipType": "many:many",
            containerID
        }));

        let pair2 = await rpStorage.Create("test suite", new MetatypeRelationshipPair({
            "name": faker.random.alphaNumeric(),
            "description": faker.random.alphaNumeric(),
            "destinationMetatype": metatype.value[0].id!,
            "originMetatype": metatype.value[1].id!,
            "relationship": relationship.value.id!,
            "relationshipType": "many:many",
            containerID
        }));

        expect(pair2.isError).false

       // EDGE SETUP
        let edge1 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value.id,
            properties: payload,
            origin_node_id: nodePair.value[0].id,
            destination_node_id: nodePair.value[1].id
        });

        expect(edge1.isError, "edge 1").false;

        let edge2 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value.id,
            properties: payload,
            origin_node_id: nodePair.value[0].id,
            destination_node_id: nodePair.value[5].id
        });

        expect(edge2.isError, "edge 2").false;

        let edge3 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair2.value.id,
            properties: payload,
            origin_node_id: nodePair.value[5].id,
            destination_node_id: nodePair.value[0].id
        });

        expect(edge3.isError, "edge 3").false;

        let edge4 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair2.value.id,
            properties: payload,
            origin_node_id: nodePair.value[5].id,
            destination_node_id: nodePair.value[6].id
        });

        expect(edge4.isError, "edge 4").false;

        let edge5 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair2.value.id,
            properties: payload,
            origin_node_id: nodePair.value[1].id,
            destination_node_id: nodePair.value[4].id
        });

        expect(edge5.isError, "edge 5").false;

        let edge6 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair2.value.id,
            properties: payload,
            origin_node_id: nodePair.value[1].id,
            destination_node_id: nodePair.value[6].id
        });

        expect(edge6.isError, "edge 6").false;

        let edge7 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value.id,
            properties: payload,
            origin_node_id: nodePair.value[4].id,
            destination_node_id: nodePair.value[5].id
        });

        expect(edge7.isError, "edge 7").false;


        let edge8 = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair2.value.id,
            properties: payload,
            origin_node_id: nodePair.value[7].id,
            destination_node_id: nodePair.value[0].id
        });

        expect(edge8.isError, "edge 8").false;

       return Promise.resolve()
    });
});

const payload: {[key:string]:any} = {
    "flower_name": "Daisy",
    "color": "yellow",
    "notRequired": 1
};

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({name: "Test", description: "flower name", required: true, propertyName: "flower_name", dataType: "string"}),
    new MetatypeKey({name: "Test2", description: "color of flower allowed", required: true, propertyName: "color", dataType: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeKey({name: "Test Not Required", description: "not required", required: false, propertyName: "notRequired", dataType: "number"}),
];