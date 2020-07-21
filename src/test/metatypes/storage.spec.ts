/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import MetatypeStorage from "../../data_storage/metatype_storage";
import Logger from "../../logger";
import ContainerStorage from "../../data_storage/container_storage";

describe('A Metatype', async() => {
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
        let storage = MetatypeStorage.Instance;

        let metatype = await storage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        return storage.PermanentlyDelete(metatype.value[0].id!)
    });

    it('can be batch saved', async()=> {
        let storage = MetatypeStorage.Instance;

        let metatype = await storage.Create(containerID, "test suite",
            [{"name": faker.name.findName(), "description": faker.random.alphaNumeric()}]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        return storage.PermanentlyDelete(metatype.value[0].id!)
    });

    it('can be retrieved from  storage', async()=> {
        let storage = MetatypeStorage.Instance;

        let metatype = await storage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let retrieved = await storage.Retrieve(metatype.value[0].id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(metatype.value[0].id);

        return storage.PermanentlyDelete(metatype.value[0].id!)
    });

    it('can be listed from storage', async()=> {
        let storage = MetatypeStorage.Instance;

        let metatype = await storage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let retrieved = await storage.List(containerID, 0, 100);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return storage.PermanentlyDelete(metatype.value[0].id!)
    });

    it('can be updated in storage', async()=> {
        let storage = MetatypeStorage.Instance;

        let metatype = await storage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let updatedName = faker.name.findName();
        let updatedDescription = faker.random.alphaNumeric();

        let updateResult = await storage.Update(metatype.value[0].id!, "test-suite",
            {name: updatedName, description: updatedDescription});
        expect(updateResult.isError).false;

        let retrieved = await storage.Retrieve(metatype.value[0].id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(metatype.value[0].id);
        expect(retrieved.value.name).eq(updatedName);
        expect(retrieved.value.description).eq(updatedDescription);

        return storage.PermanentlyDelete(metatype.value[0].id!)
    })
});
