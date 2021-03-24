/* tslint:disable */
import Logger from "../../services/logger";
import PostgresAdapter from "../../data_access_layer/mappers/db_adapters/postgres/postgres";
import faker from "faker";
import {expect} from "chai";
import ContainerMapper from "../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import EventQueueMapper from "../../data_access_layer/mappers/event_system/event_queue_mapper";
import DataSourceStorage from "../../data_access_layer/mappers/data_warehouse/import/data_source_storage";
import { DataSourceT } from "../../types/import/dataSourceT";
import DataStagingStorage from "../../data_access_layer/mappers/data_warehouse/import/data_staging_storage";
import ImportStorage from "../../data_access_layer/mappers/data_warehouse/import/import_storage";
import ExportMapper from "../../data_access_layer/mappers/data_warehouse/export/export_mapper";
import FileMapper from "../../data_access_layer/mappers/data_warehouse/data/file_mapper";
import ContainerStorage from "../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import Container from "../../data_warehouse/ontology/container";
import File from "../../data_warehouse/data/file";
import TypeMapping from "../../data_warehouse/etl/type_mapping";
import TypeMappingRepository from "../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository";
import {User} from "../../access_management/user";
import UserMapper from "../../data_access_layer/mappers/access_management/user_mapper";
import ExportRecord, {StandardConfig} from "../../data_warehouse/export/export";

describe('An Event Queue Mapper can', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";
    var dataSourceID:string = process.env.TEST_DATASOURCE_ID || "";
    let user: User

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping registered events tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init();
        const dStorage = DataSourceStorage.Instance;
        const qStorage = EventQueueMapper.Instance;

        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;
        const datasource = await dStorage.Create(containerID, "test suite", newDatasource);
        expect(datasource.isError).false;
        expect(datasource.value).not.empty;
        dataSourceID = datasource.value.id!

        const task = await qStorage.List();
        expect(task).not.empty;

        const deletedTask = await qStorage.PermanentlyDelete(task[0].id!)
        expect(deletedTask.value).true

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

        return Promise.resolve()
    });

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })


    it('can send event on datasource modify', async()=> {
        const storage = EventQueueMapper.Instance;
        const dStorage = DataSourceStorage.Instance;

        const updatedDatasource = await dStorage.Update(dataSourceID, "test suite", updateDatasource);
        expect(updatedDatasource.value).true;

        const task = await storage.List();
        expect(task).not.empty;

        const deletedTask = await storage.PermanentlyDelete(task[0].id!)
        expect(deletedTask.value).true

        return Promise.resolve()
    });

    it('can send event on data staging import', async()=> {
        const storage = EventQueueMapper.Instance;
        const dsStorage = DataStagingStorage.Instance;
        const importStorage = ImportStorage.Instance
        const mappingRepo = new TypeMappingRepository()

        let imports = await importStorage.InitiateImport(dataSourceID, "test suite", "test")

        let mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: dataSourceID,
            sample_payload: test_raw_payload
        })

        const saved = await mappingRepo.save(user, mapping)

        expect(saved.isError).false

        await dsStorage.Create(dataSourceID, imports.value, mapping.id!, test_raw_payload)

        let task = await storage.List();
        expect(task).not.empty;

        let deletedTask = await storage.PermanentlyDelete(task[0].id!)
        expect(deletedTask.value).true

        return Promise.resolve()
    });

    it('can send event on import complete', async()=> {
        const storage = EventQueueMapper.Instance;
        const importStorage = ImportStorage.Instance

        let imports = await importStorage.InitiateImport(dataSourceID, "test suite", "test");
        const importSuccess = await importStorage.SetStatus(imports.value, "completed");
        expect(importSuccess.value).true;

        let task = await storage.List();
        expect(task).not.empty;

        let deletedTask = await storage.PermanentlyDelete(task[0].id!)
        expect(deletedTask.value).true

        return Promise.resolve()
    });

    it('can send event on data export', async()=> {
        const storage = EventQueueMapper.Instance;
        const eStorage = ExportMapper.Instance;

        const dataExport = await eStorage.Create("test suite", new ExportRecord({
            container_id: containerID,
            adapter:"gremlin",
            config: new StandardConfig()}))

        expect(dataExport.isError).false;
        expect(dataExport.value).not.empty;

        // we only emit status on completed, so set the export to completed
        const set = await eStorage.SetStatus("test suite", dataExport.value.id!, "completed")
        expect(set.isError).false

        let task = await storage.List();
        expect(task).not.empty;

        let deletedTask = await storage.PermanentlyDelete(task[0].id!)
        expect(deletedTask.value).true

        return Promise.resolve()
    });

    it('can send event on file create and modify', async()=> {
        const storage = EventQueueMapper.Instance;
        const fStorage = FileMapper.Instance;

        const file = await fStorage.Create("test suite",
            new File({
                data_source_id: dataSourceID,
                container_id: containerID,
                file_name: faker.name.findName(),
                file_size: 200,
                md5hash: "",
                adapter_file_path: faker.name.findName(),
                adapter: "filesystem",
            })
        );

        expect(file.isError).false
        expect(file.value).not.empty

        let task = await storage.List();
        expect(task).not.empty;

        let deletedTask = await storage.PermanentlyDelete(task[0].id!)
        expect(deletedTask.value).true

        file.value.adapter = "azure_blob"

        let updateResult = await fStorage.Update("test-suite", file.value)
        expect(updateResult.isError).false;

        task = await storage.List();
        expect(task).not.empty;

        deletedTask = await storage.PermanentlyDelete(task[0].id!)
        expect(deletedTask.value).true

        await storage.PermanentlyDelete(file.value.id!)

        return Promise.resolve()
    });
});

const newDatasource: DataSourceT = {
    name: "Daisy",
    adapter_type: "manual",
    active: true,
    config: {}
};

const updateDatasource: DataSourceT = {
    name: "Daisy2",
    adapter_type: "manual",
    active: true,
    config: {}
};

const test_raw_payload = {
    "RAD": 0.1,
    "COLOR": "blue",
    "TYPE": "EQUIP",
    "TEST": "TEST",
    "ITEM_ID": "123"
}
