/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import ContainerStorage from "../../data_storage/container_storage";
import Logger from "../../logger";

describe('A Container', async() => {

    before(function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping container tests, no storage layer");
           this.skip()
       }

        return PostgresAdapter.Instance.init()
    });

    it('can be saved to storage', async()=> {
        let storage = ContainerStorage.Instance;

        let container = await storage.Create("test suite", {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(container.isError).false;
        expect(container.value).not.empty;

        return storage.PermanentlyDelete(container.value[0].id!)
    });

    it('can be batch saved', async()=> {
        let storage = ContainerStorage.Instance;

        let container = await storage.Create("test suite", [{"name": faker.name.findName(), "description": faker.random.alphaNumeric()}]);

        expect(container.isError).false;
        expect(container.value).not.empty;

        return storage.PermanentlyDelete(container.value[0].id!)
    });

    it('can be retrieved from  storage', async()=> {
        let storage = ContainerStorage.Instance;

        let container = await storage.Create("test suite", {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(container.isError).false;
        expect(container.value).not.empty;

        let retrieved = await storage.Retrieve(container.value[0].id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(container.value[0].id);

        return storage.PermanentlyDelete(container.value[0].id!)
    });

    it('can be listed from storage', async()=> {
        let storage = ContainerStorage.Instance;

        let container = await storage.Create("test suite", {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(container.isError).false;
        expect(container.value).not.empty;

        let retrieved = await storage.List();
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return storage.PermanentlyDelete(container.value[0].id!)
    });

    it('can be updated in storage', async()=> {
        let storage = ContainerStorage.Instance;

        let container = await storage.Create("test suite", {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(container.isError).false;
        expect(container.value).not.empty;

        let updatedName = faker.name.findName();
        let updatedDescription = faker.random.alphaNumeric();

        let updateResult = await storage.Update(container.value[0].id!, " test suite",
            {name: updatedName, description: updatedDescription});
        expect(updateResult.isError).false;

        let retrieved = await storage.Retrieve(container.value[0].id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(container.value[0].id);
        expect(retrieved.value.name).eq(updatedName);
        expect(retrieved.value.description).eq(updatedDescription);

        return storage.PermanentlyDelete(container.value[0].id!)
    })
});
