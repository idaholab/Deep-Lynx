/* tslint:disable */
import Logger from "../../services/logger";
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import MetatypeKeyMapper from "../../data_access_layer/mappers/metatype_key_mapper";
import MetatypeMapper from "../../data_access_layer/mappers/metatype_mapper";
import faker from "faker";
import {expect} from "chai";
import GraphStorage from "../../data_access_layer/mappers/graph/graph_storage";
import NodeStorage from "../../data_access_layer/mappers/graph/node_storage";
import MetatypeRelationshipMapper from "../../data_access_layer/mappers/metatype_relationship_mapper";
import MetatypeRelationshipPairMapper from "../../data_access_layer/mappers/metatype_relationship_pair_mapper";
import EdgeStorage from "../../data_access_layer/mappers/graph/edge_storage";
import {EdgeT} from "../../types/graph/edgeT";
import DataSourceStorage from "../../data_access_layer/mappers/import/data_source_storage";
import MetatypeRelationshipKeyMapper from "../../data_access_layer/mappers/metatype_relationship_key_mapper";
import Container from "../../data_warehouse/ontology/container";
import Metatype from "../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";
import MetatypeRelationship from "../../data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipPair from "../../data_warehouse/ontology/metatype_relationship_pair";
import MetatypeKey from "../../data_warehouse/ontology/metatype_key";
import MetatypeRelationshipKey from "../../data_warehouse/ontology/metatype_relationship_key";

describe('A Graph Edge can', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping nodes graph tests, no storage layer");
            this.skip()
        }


        await PostgresAdapter.Instance.init();
        let mapper = ContainerMapper.Instance;

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
        const rkStorage = MetatypeRelationshipKeyMapper.Instance;
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
        testKeys1.forEach(key => key.metatype_id = metatype.value[0].id!)
        const keys = await kStorage.BulkCreate("test suite", testKeys1);
        expect(keys.isError).false;

        const testKeys2 = [...test_keys]
        testKeys2.forEach(key => key.metatype_id = metatype.value[1].id!)
        const keys2 = await kStorage.BulkCreate( "test suite", testKeys2);
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

        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship({containerID,name: faker.name.findName(), description: faker.random.alphaNumeric()}))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        const relationshipTestKeys = [...test_relationship_keys]
        relationshipTestKeys.forEach(key => key.metatype_relationship_id = relationship.value.id!)

        const rkeys = await rkStorage.BulkCreate( "test suite", relationshipTestKeys)

        let pair = await rpStorage.Create("test suite", new MetatypeRelationshipPair({
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "originMetatype": metatype.value[0].id!,
            "destinationMetatype": metatype.value[1].id!,
            "relationship": relationship.value.id!,
            "relationshipType": "one:one",
            containerID,
        }));

       // EDGE SETUP
        let edge = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value.id,
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
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rpStorage = MetatypeRelationshipPairMapper.Instance;

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
                new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
                new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
            ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys1 = [...test_keys]
        testKeys1.forEach(key => key.metatype_id = metatype.value[0].id!)
        const keys = await kStorage.BulkCreate("test suite", testKeys1);
        expect(keys.isError).false;

        const testKeys2 = [...test_keys]
        testKeys2.forEach(key => key.metatype_id = metatype.value[1].id!)
        const keys2 = await kStorage.BulkCreate( "test suite", testKeys2);
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

        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship({containerID,name: faker.name.findName(), description: faker.random.alphaNumeric()}))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create("test suite", new MetatypeRelationshipPair({
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "originMetatype": metatype.value[0].id!,
            "destinationMetatype": metatype.value[1].id!,
            "relationship": relationship.value.id!,
            "relationshipType": "one:one",
            containerID
        }));

        // EDGE SETUP
        let edge = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value.id,
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
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rpStorage = MetatypeRelationshipPairMapper.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;

        const metatype = await mMapper.BulkCreate( "test suite",
            [
                new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
                new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
            ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys1 = [...test_keys]
        testKeys1.forEach(key => key.metatype_id = metatype.value[0].id!)
        const keys = await kStorage.BulkCreate("test suite", testKeys1);
        expect(keys.isError).false;

        const testKeys2 = [...test_keys]
        testKeys2.forEach(key => key.metatype_id = metatype.value[1].id!)
        const keys2 = await kStorage.BulkCreate( "test suite", testKeys2);
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

        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship({containerID,name: faker.name.findName(), description: faker.random.alphaNumeric()}))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create("test suite", new MetatypeRelationshipPair({
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "originMetatype": metatype.value[0].id!,
            "destinationMetatype": metatype.value[1].id!,
            "relationship": relationship.value.id!,
            "relationshipType": "one:one",
            containerID
        }));

        // EDGE SETUP
        let edge = await storage.CreateOrUpdate(containerID, graph.value.id, {
            relationship_pair_id: pair.value.id,
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
        testKeys1.forEach(key => key.metatype_id = metatype.value[0].id!)
        const keys = await kStorage.BulkCreate("test suite", testKeys1);
        expect(keys.isError).false;

        const testKeys2 = [...test_keys]
        testKeys2.forEach(key => key.metatype_id = metatype.value[1].id!)
        const keys2 = await kStorage.BulkCreate( "test suite", testKeys2);
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

        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship({containerID,name: faker.name.findName(), description: faker.random.alphaNumeric()}))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create( "test suite",  new MetatypeRelationshipPair({
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "originMetatype": metatype.value[0].id!,
            "destinationMetatype": metatype.value[1].id!,
            "relationship": relationship.value.id!,
            "relationshipType": "one:one",
            containerID
        }));

        // EDGE SETUP
        let edge = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value.id,
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
    "flower_name": "Daisy",
    "color": "yellow",
    "notRequired": 1
};

const updatePayload : {[key:string]:any} = {
    "flower_name": "Violet",
    "color": "blue",
    "notRequired": 1
};

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({name: "Test", description: "flower name", required: true, propertyName: "flower_name", dataType: "string"}),
    new MetatypeKey({name: "Test2", description: "color of flower allowed", required: true, propertyName: "color", dataType: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeKey({name: "Test Not Required", description: "not required", required: false, propertyName: "notRequired", dataType: "number"}),
];

export const test_relationship_keys: MetatypeRelationshipKey[] = [
    new MetatypeRelationshipKey({name: "Test", description: "flower name", required: true, propertyName: "flower_name", dataType: "string"}),
    new MetatypeRelationshipKey({name: "Test2", description: "color of flower allowed", required: true, propertyName: "color", dataType: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeRelationshipKey({name: "Test Not Required", description: "not required", required: false, propertyName: "notRequired", dataType: "number"}),
];
