/* tslint:disable */
import Logger from "../../logger";
import uuid from "uuid"
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import MetatypeKeyMapper from "../../data_access_layer/mappers/metatype_key_storage";
import MetatypeMapper from "../../data_access_layer/mappers/metatype_mapper";
import faker from "faker";
import {expect} from "chai";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import GraphStorage from "../../data_access_layer/mappers/graph/graph_storage";
import NodeStorage from "../../data_access_layer/mappers/graph/node_storage";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import NodeFilter from "../../data_access_layer/mappers/graph/node_filter";
import Container from "../../data_warehouse/ontology/container";
import Metatype from "../../data_warehouse/ontology/metatype";

describe('Filtering Nodes', async() => {
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

    it('can filter by equality', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mMapper.Create(containerID, "test suite",
            new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value.id!, "test suite", test_keys);
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
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mMapper.Create(containerID, "test suite",
            new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value.id!, "test suite", test_keys);
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
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mMapper.Create(containerID, "test suite",
            new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value.id!, "test suite", test_keys);
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
    "flower": "Daisy",
    "color": "yellow",
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

export const single_test_key: MetatypeKeyT = {
    name: "Test Not Required",
    property_name: "notRequired",
    required: false,
    description: "not required",
    data_type: "number",
};
