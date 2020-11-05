/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerStorage from "../../data_storage/container_storage";
import DataSourceStorage from "../../data_storage/import/data_source_storage";
import FileStorage from "../../data_storage/file_storage";

describe('A File can', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";
    var dataSourceID: string = ""

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

        let exp = await DataSourceStorage.Instance.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        dataSourceID = exp.value.id!

        return Promise.resolve()
    });

    after(async function() {
       await DataSourceStorage.Instance.PermanentlyDelete(dataSourceID)

        return ContainerStorage.Instance.PermanentlyDelete(containerID)
    })

    it('can be saved to storage', async()=> {
        let storage = FileStorage.Instance;

        let file = await storage.Create("test suite",containerID, dataSourceID, {
            file_name: faker.name.findName(),
            file_size: 200,
            md5hash: "",
            adapter_file_path: faker.name.findName(),
            adapter: "filesystem",
        })

        expect(file.isError).false
        expect(file.value).not.empty


        return storage.PermanentlyDelete(file.value.id!)
    });

    it('can be retrieved from  storage', async()=> {
        let storage = FileStorage.Instance;

        let file = await storage.Create("test suite", containerID, dataSourceID, {
            file_name: faker.name.findName(),
            file_size: 200,
            md5hash: "",
            adapter_file_path: faker.name.findName(),
            adapter: "filesystem",
        })

        let retrieved = await storage.Retrieve(file.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(file.value.id);

        return storage.PermanentlyDelete(file.value.id!)
    });

    it('can be updated in storage', async()=> {
        let storage = FileStorage.Instance;

        let file = await storage.Create("test suite", containerID, dataSourceID, {
            file_name: faker.name.findName(),
            file_size: 200,
            md5hash: "",
            adapter_file_path: faker.name.findName(),
            adapter: "filesystem",
        })

        let updateResult = await storage.Update(file.value.id!, "test-suite",
            {adapter : 'aws_s3'});
        expect(updateResult.isError).false;

        let retrieved = await storage.Retrieve(file.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(file.value.id);

        return storage.PermanentlyDelete(file.value.id!)
    })
});
