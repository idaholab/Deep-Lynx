/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import Logger from "../../../../services/logger";
import ContainerStorage from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import DataSourceMapper from "../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper";
import FileMapper from "../../../../data_access_layer/mappers/data_warehouse/data/file_mapper";
import Container from "../../../../data_warehouse/ontology/container";
import {User} from "../../../../access_management/user";
import UserMapper from "../../../../data_access_layer/mappers/access_management/user_mapper";
import File from "../../../../data_warehouse/data/file";
import DataSourceRecord from "../../../../data_warehouse/import/data_source";

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

        const container = await mapper.Create("test suite", new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        let exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        dataSourceID = exp.value.id!

        return Promise.resolve()
    });

    after(async function() {
       await DataSourceMapper.Instance.PermanentlyDelete(dataSourceID)

        return ContainerStorage.Instance.Delete(containerID)
    })

    it('can be saved to storage', async()=> {
        let mapper = FileMapper.Instance;

        let file = await mapper.Create("test suite", new File({
            file_name: faker.name.findName(),
            file_size: 200,
            md5hash: "",
            adapter_file_path: faker.name.findName(),
            adapter: "filesystem",
            data_source_id: dataSourceID,
            container_id: containerID
        }))

        expect(file.isError).false
        expect(file.value).not.empty


        return mapper.PermanentlyDelete(file.value.id!)
    });

    it('can be retrieved from  storage', async()=> {
        let mapper = FileMapper.Instance;

        let file = await mapper.Create("test suite", new File({
            file_name: faker.name.findName(),
            file_size: 200,
            md5hash: "",
            adapter_file_path: faker.name.findName(),
            adapter: "filesystem",
            data_source_id: dataSourceID,
            container_id: containerID
        }))

        let retrieved = await mapper.Retrieve(file.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(file.value.id);

        return mapper.PermanentlyDelete(file.value.id!)
    });

    it('can be updated in storage', async()=> {
        let mapper = FileMapper.Instance;

        let file = await mapper.Create("test suite",new File({
            file_name: faker.name.findName(),
            file_size: 200,
            md5hash: "",
            adapter_file_path: faker.name.findName(),
            adapter: "filesystem",
            data_source_id: dataSourceID,
            container_id: containerID
        }))

        expect(file.isError).false
        file.value.adapter = "azure_blob"

        let updateResult = await mapper.Update("test-suite", file.value)
        expect(updateResult.isError).false;

        let retrieved = await mapper.Retrieve(file.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(file.value.id);

        return mapper.PermanentlyDelete(file.value.id!)
    })
});
