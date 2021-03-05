/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_mappers/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import DataSourceStorage from "../../data_mappers/import/data_source_storage";
import FileStorage from "../../data_mappers/file_storage";
import Container from "../../data_warehouse/ontology/container";

describe('A File can', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";
    var dataSourceID: string = ""

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

        return ContainerStorage.Instance.Delete(containerID)
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
