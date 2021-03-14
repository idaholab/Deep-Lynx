/* tslint:disable */
import Logger from "../../services/logger";
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import MetatypeKeyMapper from "../../data_access_layer/mappers/metatype_key_mapper";
import MetatypeMapper from "../../data_access_layer/mappers/metatype_mapper";
import faker from "faker";
import {expect} from "chai";
import GraphStorage from "../../data_access_layer/mappers/graph/graph_storage";
import NodeStorage from "../../data_access_layer/mappers/graph/node_storage";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import DataSourceStorage from "../../data_access_layer/mappers/import/data_source_storage";
import {NodeT} from "../../types/graph/nodeT";
import Container from "../../data_warehouse/ontology/container";
import Metatype from "../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";
import MetatypeKey from "../../data_warehouse/ontology/metatype_key";

describe('Graph Node Creation', async() => {
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

    // more advanced tests on payload rejection based on automatic types happen
    // in test/metatype_keys/compile
    it('can reject malformed payload', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;


        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await kStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const node = await storage.CreateOrUpdate(containerID, graph.value.id, malformed_payload);
        expect(node.isError, metatype.error?.error).true;


        await mMapper.PermanentlyDelete(metatype.value.id!);
        await gStorage.PermanentlyDelete(graph.value.id);
        return Promise.resolve()
    });

    it('can save mixed node types', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));


        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await kStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value.id!,
            properties: payload
        };

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        await mMapper.PermanentlyDelete(metatype.value.id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    });

    it('can update mixed node types', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));


        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await kStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value.id!,
            properties: payload
        };

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        // Run the update test

        node.value[0].properties = updatedPayload;
        node.value[0].modified_at = new Date().toISOString();

        const updatedNode = await storage.CreateOrUpdate(containerID, graph.value.id,  node.value[0]);
        expect(updatedNode.isError, updatedNode.error?.error).false;

        await mMapper.PermanentlyDelete(metatype.value.id!);
        await gStorage.PermanentlyDelete(graph.value.id);

    });

    it('won\'t update mixed node types with malformed payload', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));


        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await kStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value.id!,
            properties: payload
        };

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        // Run the update test
        node.value[0].properties = malformed_payload;
        node.value[0].modified_at = new Date().toISOString();
        const updatedNode = await storage.CreateOrUpdate(containerID, graph.value.id,  node.value[0]);
        expect(updatedNode.isError, updatedNode.error?.error).true;

        await mMapper.PermanentlyDelete(metatype.value.id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    })


    it('can retrieve by original ID', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
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

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));


        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await kStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value.id!,
            data_source_id: dataSource.value.id!,
            composite_original_id: "test",
            properties: payload
        } as NodeT;

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        const fetchedNode = await storage.RetrieveByCompositeOriginalID("test", dataSource.value.id!)
        expect(fetchedNode.isError).false
        expect(fetchedNode.value.data_source_id).equals(dataSource.value.id!)

        await mMapper.PermanentlyDelete(metatype.value.id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    });

    it('can update by original ID', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
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

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));


        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await kStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value.id!,
            data_source_id: dataSource.value.id!,
            original_data_id: "test",
            properties: payload
        } as NodeT;

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        node.value[0].properties = updatedPayload;
        node.value[0].modified_at = new Date().toISOString();
        node.value[0].id = undefined

        const updatedNode = await storage.CreateOrUpdate(containerID, graph.value.id,  node.value[0]);
        expect(updatedNode.isError).false;


        await mMapper.PermanentlyDelete(metatype.value.id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    })


    it('can save with default values', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));


        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_key_defaultValue]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await kStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value.id!,
            properties: payload
        };

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        await mMapper.PermanentlyDelete(metatype.value.id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    });

    it('can save with regex matched payloads', async()=> {
        const storage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;

        // SETUP
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));


        expect(metatype.isError).false;
        expect(metatype.value).not.empty;


        const regex_test_key: MetatypeKey = new MetatypeKey({
            name: "Test Key Regex",
            propertyName: "regex",
            required: true,
            description: "testing key regex",
            dataType: "string",
            // validation is a pattern match verifying that the value has at least 6 characters
            // with 1 uppercase, 1 lowercase, 1 number and no spaces test at https://regex101.com/r/fX8dY0/1
            validation: {regex: "^((?=\\S*?[A-Z])(?=\\S*?[a-z])(?=\\S*?[0-9]).{6,})\\S$"},
            metatypeID: metatype.value.id
        })

        const keys = await kStorage.Create("test suite", regex_test_key);
        expect(keys.isError).false;

        const mixed = {
            metatype_id: metatype.value.id!,
            properties: regex_payload
        };

        const node = await storage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        const fails = {
            metatype_id: metatype.value.id!,
            properties: regex_payload_fails
        };

        const node2 = await storage.CreateOrUpdate(containerID, graph.value.id,  fails);
        expect(node2.isError, metatype.error?.error).true;

        await mMapper.PermanentlyDelete(metatype.value.id!);
        return gStorage.PermanentlyDelete(graph.value.id);
    });
});

const payload: {[key:string]:any} = {
    "flower_name": "Daisy",
    "color": "yellow",
    "notRequired": 1
};

const updatedPayload: {[key:string]:any} = {
    "flower_name": "Violet",
    "color": "blue",
    "notRequired": 1
};

const malformed_payload: {[key:string]:any} = {
    "flower": "Daisy",
    "notRequired": 1
};

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({name: "Test", description: "flower name", required: true, propertyName: "flower_name", dataType: "string"}),
    new MetatypeKey({name: "Test2", description: "color of flower allowed", required: true, propertyName: "color", dataType: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeKey({name: "Test Not Required", description: "not required", required: false, propertyName: "notRequired", dataType: "number"}),
];


const test_key_defaultValue: MetatypeKey[] = [
    new MetatypeKey({
    name: "Test",
    propertyName: "flower_name",
    required: true,
    description: "flower name",
    dataType: "string"
}),
   new MetatypeKey({
        name: "Test 2",
        propertyName: "color",
        required: true,
        description: "color of flower allowed",
        dataType: "enumeration",
        options: ["yellow", "blue"]
    }),
    new MetatypeKey({
        name: "Test Default Value Number",
        propertyName: "default",
        required: true,
        description: "not required",
        dataType: "number",
        defaultValue: 1
    }), new MetatypeKey({
        name: "Test Default Value String",
        propertyName: "defaultString",
        required: true,
        description: "not required",
        dataType: "string",
        defaultValue: "test"
    }),new MetatypeKey({
        name: "Test Default Value Enum",
        propertyName: "defaultEnum",
        required: true,
        description: "not required",
        dataType: "enumeration",
        defaultValue: "yellow",
        options: ["yellow", "blue"]
    }),new MetatypeKey({
        name: "Test Default Value Boolean",
        propertyName: "defaultBoolean",
        required: true,
        description: "not required",
        dataType: "boolean",
        defaultValue: true,
    })
];

export const single_test_key: MetatypeKey = new MetatypeKey({name: "Test Not Required", description: "not required", required: false, propertyName: "notRequired", dataType: "number"})


const regex_payload : {[key:string]:any} = {
    regex: "Catcat1"
};

const regex_payload_fails : {[key:string]:any} = {
    regex: "catcat"
};
