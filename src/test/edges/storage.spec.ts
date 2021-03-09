/* tslint:disable */
import Logger from "../../logger";
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import MetatypeKeyMapper from "../../data_access_layer/mappers/metatype_key_storage";
import MetatypeMapper from "../../data_access_layer/mappers/metatype_mapper";
import faker from "faker";
import {expect} from "chai";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import GraphStorage from "../../data_access_layer/mappers/graph/graph_storage";
import NodeStorage from "../../data_access_layer/mappers/graph/node_storage";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import {MetatypeRelationshipKeyT} from "../../types/metatype_relationship_keyT";
import MetatypeRelationshipStorage from "../../data_access_layer/mappers/metatype_relationship_storage";
import MetatypeRelationshipPairStorage from "../../data_access_layer/mappers/metatype_relationship_pair_storage";
import EdgeStorage from "../../data_access_layer/mappers/graph/edge_storage";
import {EdgeT} from "../../types/graph/edgeT";
import DataSourceStorage from "../../data_access_layer/mappers/import/data_source_storage";
import MetatypeRelationshipKeyStorage from "../../data_access_layer/mappers/metatype_relationship_key_storage";
import Container from "../../data_warehouse/ontology/container";
import Metatype from "../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";

describe('A Graph Edge can', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

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
        const rStorage = MetatypeRelationshipStorage.Instance;
        const rkStorage = MetatypeRelationshipKeyStorage.Instance;
        const rpStorage = MetatypeRelationshipPairStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mMapper.BulkCreate( "test suite",
            [
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
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
        }];

        const node = await nStorage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        let relationship = await rStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        const rkeys = await rkStorage.Create(relationship.value[0].id!, "test suite", test_relationship_keys)

        let pair = await rpStorage.Create(containerID, "test suite", {
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype_id": metatype.value[0].id,
            "destination_metatype_id": metatype.value[1].id,
            "relationship_id": relationship.value[0].id,
            "relationship_type": "one:one"
        });

       // EDGE SETUP
        let edge = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value[0].id,
            properties: payload,
            origin_node_id: node.value[0].id,
            destination_node_id: node.value[1].id
        });

        expect(edge.isError).false;


       await mMapper.PermanentlyDelete(metatype.value[0].id!);
       return gStorage.PermanentlyDelete(graph.value.id)
    });

    it('can be created with original IDs in place of nodeIDS', async()=> {
        const storage = EdgeStorage.Instance;
        const nStorage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;
        const rStorage = MetatypeRelationshipStorage.Instance;
        const rpStorage = MetatypeRelationshipPairStorage.Instance;

        // we must create a valid data source for this test
        const dataStorage = DataSourceStorage.Instance;

        let exp = await dataStorage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                });

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mMapper.BulkCreate( "test suite",
            [
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
            ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        const keys2 = await kStorage.Create(metatype.value[1].id!, "test suite", test_keys);
        expect(keys2.isError).false;

        const mixed = [{
            metatype_id: metatype.value[0].id!,
            properties: payload,
            data_source_id: exp.value.id!,
            composite_original_id: faker.name.firstName()
        },{
            metatype_id: metatype.value[1].id!,
            properties: payload,
            data_source_id: exp.value.id!,
            composite_original_id: faker.name.firstName()
        }];

        const node = await nStorage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        let relationship = await rStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create(containerID, "test suite", {
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype_id": metatype.value[0].id,
            "destination_metatype_id": metatype.value[1].id,
            "relationship_id": relationship.value[0].id,
            "relationship_type": "one:one"
        });

        // EDGE SETUP
        let edge = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value[0].id,
            properties: payload,
            origin_node_composite_original_id: node.value[0].composite_original_id,
            destination_node_composite_original_id: node.value[1].composite_original_id,
            data_source_id: exp.value.id!
        } as EdgeT);

        expect(edge.isError).false;


        await mMapper.PermanentlyDelete(metatype.value[0].id!);
        return gStorage.PermanentlyDelete(graph.value.id)
    });

    it('can be archived and permanently deleted', async()=> {
        const storage = EdgeStorage.Instance;
        const nStorage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;
        const rStorage = MetatypeRelationshipStorage.Instance;
        const rpStorage = MetatypeRelationshipPairStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;

        const metatype = await mMapper.BulkCreate( "test suite",
            [
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
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
        }];

        const node = await nStorage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        let relationship = await rStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create(containerID, "test suite", {
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype_id": metatype.value[0].id,
            "destination_metatype_id": metatype.value[1].id,
            "relationship_id": relationship.value[0].id,
            "relationship_type": "one:one"
        });

        // EDGE SETUP
        let edge = await storage.CreateOrUpdate(containerID, graph.value.id, {
            relationship_pair_id: pair.value[0].id,
            properties: payload,
            origin_node_id: node.value[0].id,
            destination_node_id: node.value[1].id
        });

        expect(edge.isError).false;

        let archived = await storage.Archive(edge.value[0].id!);
        expect(archived.isError).false;

        let deleted = await storage.PermanentlyDelete(edge.value[0].id!);
        expect(deleted.isError).false;

        await mMapper.PermanentlyDelete(metatype.value[0].id!);
        return gStorage.PermanentlyDelete(graph.value.id)
    });

    it('can be updated', async()=> {
        const storage = EdgeStorage.Instance;
        const nStorage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;
        const rStorage = MetatypeRelationshipStorage.Instance;
        const rpStorage = MetatypeRelationshipPairStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;


        const metatype = await mMapper.BulkCreate( "test suite",
            [
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
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
        }];

        const node = await nStorage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        let relationship = await rStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create(containerID, "test suite", {
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype_id": metatype.value[0].id,
            "destination_metatype_id": metatype.value[1].id,
            "relationship_id": relationship.value[0].id,
            "relationship_type": "one:one"
        });

        // EDGE SETUP
        let edge = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value[0].id,
            properties: payload,
            origin_node_id: node.value[0].id,
            destination_node_id: node.value[1].id
        });

        expect(edge.isError).false;

       edge.value[0].modified_at = new Date().toISOString();

        let updatedEdge = await storage.CreateOrUpdate(containerID, graph.value.id,  edge.value[0]);
        expect(updatedEdge.isError, updatedEdge.error?.error).false;

        await mMapper.PermanentlyDelete(metatype.value[0].id!);
        return gStorage.PermanentlyDelete(graph.value.id)
    })
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
