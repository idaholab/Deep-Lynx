/* tslint:disable */
/*
import Logger from "../../../../services/logger";
import uuid from "uuid"
import PostgresAdapter from "../../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import MetatypeKeyMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import MetatypeMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import faker from "faker";
import {expect} from "chai";
import GraphMapper from "../../../../data_access_layer/mappers/data_warehouse/data/graph_mapper";
import NodeMapper from "../../../../data_access_layer/mappers/data_warehouse/data/node_mapper";
import ContainerStorage from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import NodeFilter from "../../../../data_access_layer/mappers/data_warehouse/data/node_filter";
import Container from "../../../../data_warehouse/ontology/container";
import Metatype from "../../../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import MetatypeKey from "../../../../data_warehouse/ontology/metatype_key";

describe('Filtering Nodes', async() => {
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

    it('can filter by equality', async()=> {
        const storage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphMapper.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mMapper.Create("test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;
        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        const keys = await kStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value.id!,
            properties: payload
        };

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        // filter by metatypeID
        const filter = new NodeFilter()
        let nodes = await filter.where()
            .containerID("eq", containerID)
            .and()
            .metatypeID("eq", metatype.value.id!)
            .all()
        expect(nodes.isError, nodes.error?.error).false
        expect(nodes.value).not.empty

        // check garbage
        let noNodes = await filter.where()
            .containerID("eq", containerID)
            .and()
            .metatypeID("eq", uuid.v4())
            .all()
        expect(noNodes.isError, nodes.error?.error).false
        expect(noNodes.value).empty

        // check inequality
        nodes = await filter.where()
            .containerID("eq",containerID)
            .and()
            .metatypeID("neq", uuid.v4())
            .all()
        expect(nodes.isError, nodes.error?.error).false
        expect(nodes.value).not.empty

        // check name filter
        nodes = await filter.where()
            .containerID("eq",containerID)
            .and()
            .metatypeName("eq", metatype.value.name)
            .all()
        expect(nodes.isError, nodes.error?.error).false
        expect(nodes.value).not.empty

        await mMapper.PermanentlyDelete(metatype.value.id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    });

    it('can filter by like', async()=> {
        const storage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphMapper.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mMapper.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        const keys = await kStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value.id!,
            properties: payload
        };

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        // filter by name likeness
        const filter = new NodeFilter()
        let nodes = await filter.where()
            .containerID("eq", containerID)
            .and()
            .metatypeName("like", metatype.value.name)
            .all()
        expect(nodes.isError, nodes.error?.error).false
        expect(nodes.value).not.empty

        await mMapper.PermanentlyDelete(metatype.value.id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    });

    it('can filter by ids', async()=> {
        const storage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphMapper.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mMapper.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        const keys = await kStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value.id!,
            properties: payload
        };

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        // filter by node id IN
        let filter = new NodeFilter()
        let nodes = await filter.where()
            .containerID("eq", containerID)
            .and()
            .id("in", [node.value[0].id])
            .all()
        expect(nodes.isError, nodes.error?.error).false
        expect(nodes.value).not.empty

        // verify we can do the same with comma separated lists
        filter = new NodeFilter()
        nodes = await filter.where()
            .id("in", node.value[0].id)
            .all()
        expect(nodes.isError, nodes.error?.error).false
        expect(nodes.value).not.empty


        await mMapper.PermanentlyDelete(metatype.value.id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    });

});

const payload: {[key:string]:any} = {
    "flower_name": "Daisy",
    "color": "yellow",
    "notRequired": 1
};


export const test_keys: MetatypeKey[] = [
    new MetatypeKey({name: "Test", description: "flower name", required: true, property_name: "flower_name", data_type: "string"}),
    new MetatypeKey({name: "Test2", description: "color of flower allowed", required: true, property_name: "color", data_type: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeKey({name: "Test Not Required", description: "not required", required: false, property_name: "notRequired", data_type: "number"}),
];

export const single_test_key: MetatypeKey = new MetatypeKey({name: "Test Not Required", description: "not required", required: false, property_name: "notRequired", data_type: "number"})
*/
