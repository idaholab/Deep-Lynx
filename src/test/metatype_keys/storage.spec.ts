/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import MetatypeKeyMapper from "../../data_access_layer/mappers/metatype_key_mapper";
import Logger from "../../logger";
import MetatypeMapper from "../../data_access_layer/mappers/metatype_mapper";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import Container from "../../data_warehouse/ontology/container";
import Metatype from "../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";
import {MetatypeKeyT} from "../../types/metatype_keyT";

describe('A Metatype Key', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping metatype tests, no storage layer");
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

    it('can be saved to storage', async()=> {
        let storage = MetatypeKeyMapper.Instance;
        let mMapper = MetatypeMapper.Instance;

        let metatype = await mMapper.Create( "test suite",
            new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await storage.Create(metatype.value.id!, "test suite", test_keys);
        expect(keys.isError).false;

        return mMapper.PermanentlyDelete(metatype.value.id!)
    });

    it('can be saved to storage with valid regex', async()=> {
        let storage = MetatypeKeyMapper.Instance;
        let mMapper = MetatypeMapper.Instance;

        let metatype = await mMapper.Create( "test suite",
            new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await storage.Create(metatype.value.id!, "test suite", test_keys);
        expect(keys.isError).false;

        return mMapper.PermanentlyDelete(metatype.value.id!)
    });


    it('can be retrieved from  storage', async()=> {
        let storage = MetatypeKeyMapper.Instance;
        let mMapper = MetatypeMapper.Instance;

        let metatype = await mMapper.Create( "test suite",
            new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let key = await storage.Create(metatype.value.id!, "test suite", single_test_key);
        expect(key.isError).false;
        expect(key.value).not.empty;

        let retrieved = await storage.Retrieve(key.value[0].id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(key.value[0].id);

        return mMapper.PermanentlyDelete(metatype.value.id!)
    });

    it('can be listed from storage', async()=> {
        let mMapper = MetatypeMapper.Instance;
        let storage = MetatypeKeyMapper.Instance;

        let metatype = await mMapper.Create( "test suite",
            new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await storage.Create(metatype.value.id!, "test suite", test_keys);
        expect(keys.isError).false;

        let retrieved = await storage.List(metatype.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;
        expect(retrieved.value).length(keys.value.length);

        return mMapper.PermanentlyDelete(metatype.value.id!)
    })

    it('can be batch updated', async()=> {
        let storage = MetatypeKeyMapper.Instance;
        let mMapper = MetatypeMapper.Instance;

        let metatype = await mMapper.Create( "test suite",
            new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await storage.Create(metatype.value.id!, "test suite", test_keys);
        expect(keys.isError).false;

        let updateKeys = await storage.BatchUpdate(keys.value, "test suite");
        expect(updateKeys.isError).false;

        return mMapper.PermanentlyDelete(metatype.value.id!)
    });
});
export const test_keys: MetatypeKeyT[] = [{
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
        validation: {
            regex: '/\\S+/'
        }
    },
];

export const single_test_key: MetatypeKeyT = {
    name: "Test Not Required",
    property_name: "notRequired",
    required: false,
    description: "not required",
    data_type: "number",
};

export const single_test_key_regex: MetatypeKeyT = {
    name: "Test Not Required",
    property_name: "notRequired",
    required: false,
    description: "not required",
    data_type: "number",
    validation: {
        regex: '/\\S+/'
    }
};
