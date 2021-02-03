/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import MetatypeKeyStorage from "../../data_storage/metatype_key_storage";
import Logger from "../../logger";
import MetatypeStorage from "../../data_storage/metatype_storage";
import {single_test_key, test_keys} from "./compile.spec";
import ContainerStorage from "../../data_storage/container_storage";

describe('A Metatype Key', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping metatype tests, no storage layer");
           this.skip()
       }

        let storage = ContainerStorage.Instance;
        await PostgresAdapter.Instance.init();

        let container = await storage.Create("test suite", {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value[0].id!;

        return Promise.resolve()
    });

    it('can be saved to storage', async()=> {
        let storage = MetatypeKeyStorage.Instance;
        let mStorage = MetatypeStorage.Instance;

        let metatype = await mStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await storage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        return mStorage.PermanentlyDelete(metatype.value[0].id!)
    });

    it('can be saved to storage with valid regex', async()=> {
        let storage = MetatypeKeyStorage.Instance;
        let mStorage = MetatypeStorage.Instance;

        let metatype = await mStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await storage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        return mStorage.PermanentlyDelete(metatype.value[0].id!)
    });


    it('can be retrieved from  storage', async()=> {
        let storage = MetatypeKeyStorage.Instance;
        let mStorage = MetatypeStorage.Instance;

        let metatype = await mStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let key = await storage.Create(metatype.value[0].id!, "test suite", single_test_key);
        expect(key.isError).false;
        expect(key.value).not.empty;

        let retrieved = await storage.Retrieve(key.value[0].id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(key.value[0].id);

        return mStorage.PermanentlyDelete(metatype.value[0].id!)
    });

    it('can be listed from storage', async()=> {
        let mStorage = MetatypeStorage.Instance;
        let storage = MetatypeKeyStorage.Instance;

        let metatype = await mStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await storage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let retrieved = await storage.List(metatype.value[0].id!);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;
        expect(retrieved.value).length(keys.value.length);

        return mStorage.PermanentlyDelete(metatype.value[0].id!)
    })

    it('can be batch updated', async()=> {
        let storage = MetatypeKeyStorage.Instance;
        let mStorage = MetatypeStorage.Instance;

        let metatype = await mStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await storage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let updateKeys = await storage.BatchUpdate(keys.value, "test suite");
        expect(updateKeys.isError).false;

        return mStorage.PermanentlyDelete(metatype.value[0].id!)
    });
});
