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
import DataSourceStorage from "../../data_storage/import/data_source_storage";
import {NodeT} from "../../types/graph/nodeT";

describe('Graph Node Creation', async() => {
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

    // more advanced tests on payload rejection based on automatic types happen
    // in test/metatype_keys/compile
    it('can reject malformed payload', async()=> {
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


        const node = await storage.CreateOrUpdate(containerID, graph.value.id, malformed_payload);
        expect(node.isError, metatype.error?.error).true;


        await mStorage.PermanentlyDelete(metatype.value[0].id!);
        await gStorage.PermanentlyDelete(graph.value.id);
        return Promise.resolve()
    });

    it('can save mixed node types', async()=> {
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

        await mStorage.PermanentlyDelete(metatype.value[0].id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    });

    it('can update mixed node types', async()=> {
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

        // Run the update test

        node.value[0].properties = updatedPayload;
        node.value[0].modified_at = new Date()

        const updatedNode = await storage.CreateOrUpdate(containerID, graph.value.id,  node.value[0]);
        expect(updatedNode.isError, updatedNode.error?.error).false;

        await mStorage.PermanentlyDelete(metatype.value[0].id!);
        await gStorage.PermanentlyDelete(graph.value.id);

    });

    it('won\'t update mixed node types with malformed payload', async()=> {
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

        // Run the update test
        node.value[0].properties = malformed_payload;
        node.value[0].modified_at = new Date()
        const updatedNode = await storage.CreateOrUpdate(containerID, graph.value.id,  node.value[0]);
        expect(updatedNode.isError, updatedNode.error?.error).true;

        await mStorage.PermanentlyDelete(metatype.value[0].id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    })


    it('can retrieve by original ID', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyStorage.Instance;
        const mStorage = MetatypeStorage.Instance;
        const gStorage = GraphStorage.Instance;
        const dStorage = DataSourceStorage.Instance

        let dataSource = await dStorage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
                data_format: "json",
                config: {}});

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
            data_source_id: dataSource.value.id!,
            original_data_id: "test",
            properties: payload
        } as NodeT;

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        const fetchedNode = await storage.RetrieveByOriginalID("test", dataSource.value.id!)
        expect(fetchedNode.isError).false
        expect(fetchedNode.value.data_source_id).equals(dataSource.value.id!)

        await mStorage.PermanentlyDelete(metatype.value[0].id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    });

    it('can update by original ID', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyStorage.Instance;
        const mStorage = MetatypeStorage.Instance;
        const gStorage = GraphStorage.Instance;
        const dStorage = DataSourceStorage.Instance

        let dataSource = await dStorage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
                data_format: "json",
                config: {}});

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
            data_source_id: dataSource.value.id!,
            original_data_id: "test",
            properties: payload
        } as NodeT;

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        node.value[0].properties = updatedPayload;
        node.value[0].modified_at = new Date()
        node.value[0].id = undefined

        const updatedNode = await storage.CreateOrUpdate(containerID, graph.value.id,  node.value[0]);
        expect(updatedNode.isError).false;


        await mStorage.PermanentlyDelete(metatype.value[0].id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    })
});

const payload: {[key:string]:any} = {
    "flower": "Daisy",
    "color": "yellow",
    "notRequired": 1
};

const updatedPayload: {[key:string]:any} = {
    "flower": "Violet",
    "color": "blue",
    "notRequired": 1
};

const malformed_payload: {[key:string]:any} = {
    "flower": "Daisy",
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
