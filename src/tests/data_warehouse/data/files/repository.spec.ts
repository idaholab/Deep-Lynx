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
import FileRepository from "../../../../data_access_layer/repositories/data_warehouse/data/file_repository";
import DataSourceRecord from "../../../../data_warehouse/import/data_source";

describe('A File Repository can', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";
    var dataSourceID: string = ""
    let user: User

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping export tests, no storage layer");
           this.skip()
       }

        await PostgresAdapter.Instance.init();
        let mapper = ContainerStorage.Instance;

        const userResult = await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value

        const container = await mapper.Create(user.id!, new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

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

    it('can save a File', async()=> {
        const fileRepo = new FileRepository()

        let file = new File({
            file_name: faker.name.findName(),
            file_size: 200,
            md5hash: "",
            adapter_file_path: faker.name.findName(),
            adapter: "filesystem",
            data_source_id: dataSourceID,
            container_id: containerID
        })

        let saved = await fileRepo.save(file, user)
        expect(saved.isError).false
        expect(file.id).not.undefined

        // run an update
        const updatedName = faker.name.findName()
        file.file_name = updatedName

        saved = await fileRepo.save(file, user)
        expect(saved.isError).false
        expect(file.file_name).eq(updatedName)

        return fileRepo.delete(file)
    });
});
