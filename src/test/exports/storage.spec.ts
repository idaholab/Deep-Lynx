/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerStorage from "../../data_storage/container_storage";
import ExportStorage from "../../data_storage/export/export_storage";

describe('An Export', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping export tests, no storage layer");
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
        let storage = ExportStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {container_id: containerID, adapter:"gremlin", config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be retrieved from  storage', async()=> {
        let storage = ExportStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {container_id: containerID, adapter:"gremlin", config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let retrieved = await storage.Retrieve(exp.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(exp.value.id);

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be listed from storage', async()=> {
        let storage = ExportStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {container_id: containerID, adapter:"gremlin", config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let retrieved = await storage.List(containerID);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be updated in storage', async()=> {
        let storage = ExportStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {container_id: containerID, adapter:"gremlin", config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        let updateResult = await storage.Update(exp.value.id!, "test-suite",
            {status:"processing"});
        expect(updateResult.isError).false;

        let retrieved = await storage.Retrieve(exp.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.status).eq("processing");

        return storage.PermanentlyDelete(exp.value.id!)
    })
});
