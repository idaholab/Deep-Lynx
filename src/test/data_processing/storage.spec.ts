/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import DataSourceStorage from "../../data_access_layer/mappers/import/data_source_storage";
import Container from "../../data_warehouse/ontology/container";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";

describe('A Data Source', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping export tests, no storage layer");
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
        let storage = DataSourceStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json"});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be retrieved from  storage', async()=> {
        let storage = DataSourceStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json"});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let retrieved = await storage.Retrieve(exp.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(exp.value.id);

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be listed from storage', async()=> {
        let storage = DataSourceStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                poll_interval:2,
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let retrieved = await storage.ListForContainer(containerID);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can list active after date from storage', async()=> {
        let storage = DataSourceStorage.Instance;
        let currentTime = new Date()

        let activeSince = await storage.ListActiveSince(currentTime)
        expect(activeSince.isError).false
        expect(activeSince.value).empty

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:true ,
                adapter_type:"manual",
                data_format: "json",
                poll_interval:2,
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        // check if is active
        let active = await storage.IsActive(exp.value.id!)

        expect(active.isError).false
        expect(active.value).true

        let retrieved = await storage.ListForContainer(containerID);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        activeSince = await storage.ListActiveSince(currentTime)
        expect(activeSince.isError).false
        expect(activeSince.value).not.empty

        // should not happen now
        activeSince = await storage.ListActiveSince(new Date((Date.now() + (60 * 1000))))
        expect(activeSince.isError).false
        expect(activeSince.value).empty

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be updated in storage', async()=> {
        let storage = DataSourceStorage.Instance;


        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        let updateResult = await storage.Update(exp.value.id!, "test-suite",
            {active:false});
        expect(updateResult.isError).false;

        let retrieved = await storage.Retrieve(exp.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.active).false;

        return storage.PermanentlyDelete(exp.value.id!)
    })
});
