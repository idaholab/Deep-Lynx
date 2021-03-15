/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import MetatypeKeyMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import Logger from "../../../../services/logger";
import MetatypeMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import ContainerStorage from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import Container from "../../../../data_warehouse/ontology/container";
import Metatype from "../../../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import MetatypeKey from "../../../../data_warehouse/ontology/metatype_key";

describe('A Metatype Key', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping metatype tests, no storage layer");
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

    it('can be saved to storage', async()=> {
        let storage = MetatypeKeyMapper.Instance;
        let mMapper = MetatypeMapper.Instance;

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await storage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        return mMapper.PermanentlyDelete(metatype.value.id!)
    });

    it('can be saved to storage with valid regex', async()=> {
        let storage = MetatypeKeyMapper.Instance;
        let mMapper = MetatypeMapper.Instance;

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await storage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        return mMapper.PermanentlyDelete(metatype.value.id!)
    });


    it('can be retrieved from  storage', async()=> {
        let storage = MetatypeKeyMapper.Instance;
        let mMapper = MetatypeMapper.Instance;

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKey: MetatypeKey = new MetatypeKey({
            name: "Test Not Required",
            description: "not required",
            required: false,
            propertyName: "notRequired",
            dataType: "number",
            metatypeID: metatype.value.id!})
        let key = await storage.Create("test suite", testKey);
        expect(key.isError).false;
        expect(key.value).not.empty;

        let retrieved = await storage.Retrieve(key.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(key.value.id);

        return mMapper.PermanentlyDelete(metatype.value.id!)
    });

    it('can be listed from storage', async()=> {
        let mMapper = MetatypeMapper.Instance;
        let storage = MetatypeKeyMapper.Instance;

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;


        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await storage.BulkCreate( "test suite", testKeys);
        expect(keys.isError).false;

        let retrieved = await storage.ListForMetatype(metatype.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;
        expect(retrieved.value).length(keys.value.length);

        return mMapper.PermanentlyDelete(metatype.value.id!)
    })

    it('can be batch updated', async()=> {
        let storage = MetatypeKeyMapper.Instance;
        let mMapper = MetatypeMapper.Instance;

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await storage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let updateKeys = await storage.BulkUpdate("test suite", keys.value);
        expect(updateKeys.isError).false;

        return mMapper.PermanentlyDelete(metatype.value.id!)
    });
});

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({name: "Test", description: "flower name", required: true, propertyName: "flower_name", dataType: "string"}),
    new MetatypeKey({name: "Test2", description: "color of flower allowed", required: true, propertyName: "color", dataType: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeKey({name: "Test Not Required", description: "not required", required: false, propertyName: "notRequired", dataType: "number"}),
];
