/* tslint:disable */
import Logger from "../../logger";
import uuid from "uuid"
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import MetatypeKeyStorage from "../../data_storage/metatype_key_storage";
import MetatypeStorage from "../../data_storage/metatype_storage";
import faker from "faker";
import {expect} from "chai";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import GraphStorage from "../../data_storage/graph/graph_storage";
import NodeStorage from "../../data_storage/graph/node_storage";
import ContainerStorage from "../../data_storage/container_storage";
import NodeFilter from "../../data_storage/graph/node_filter";

describe('Filtering Nodes', async() => {
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

    it('can filter by equality', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyStorage.Instance;
        const mStorage = MetatypeStorage.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value[0].id!,
            properties: payload
        };

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        // filter by metatypeID
        const filter = new NodeFilter()
        let nodes = await filter.where()
            .containerID("eq", containerID)
            .and()
            .metatypeID("eq", metatype.value[0].id!)
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
            .metatypeName("eq", metatype.value[0].name)
            .all()
        expect(nodes.isError, nodes.error?.error).false
        expect(nodes.value).not.empty

        await mStorage.PermanentlyDelete(metatype.value[0].id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    });

    it('can filter by like', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyStorage.Instance;
        const mStorage = MetatypeStorage.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value[0].id!,
            properties: payload
        };

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        // filter by name likeness
        const filter = new NodeFilter()
        let nodes = await filter.where()
            .containerID("eq", containerID)
            .and()
            .metatypeName("like", metatype.value[0].name)
            .all()
        expect(nodes.isError, nodes.error?.error).false
        expect(nodes.value).not.empty

        await mStorage.PermanentlyDelete(metatype.value[0].id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    });

    it('can filter by ids', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyStorage.Instance;
        const mStorage = MetatypeStorage.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value[0].id!,
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


        await mStorage.PermanentlyDelete(metatype.value[0].id!);
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
