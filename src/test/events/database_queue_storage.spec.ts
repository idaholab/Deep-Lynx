/* tslint:disable */
import Logger from "../../logger";
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import faker from "faker";
import {expect} from "chai";
import ContainerStorage from "../../data_storage/container_storage";
import QueueStorage from "../../data_storage/events/queue_storage";
import DataSourceStorage from "../../data_storage/import/data_source_storage";
import { DataSourceT } from "../../types/import/dataSourceT";
import DataStagingStorage from "../../data_storage/import/data_staging_storage";
import ImportStorage from "../../data_storage/import/import_storage";
import ExportStorage from "../../data_storage/export/export_storage";
import FileStorage from "../../data_storage/file_storage";

describe('Database Queue Event Creation', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";
    var dataSourceID:string = process.env.TEST_DATASOURCE_ID || "";

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping registered events tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init();
        let storage = ContainerStorage.Instance;
        const dStorage = DataSourceStorage.Instance;
        const qStorage = QueueStorage.Instance;

        let container = await storage.Create( "test suite", {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value[0].id!;

        const datasource = await dStorage.Create(containerID, "test suite", newDatasource);
        expect(datasource.isError).false;
        expect(datasource.value).not.empty;
        dataSourceID = datasource.value.id!

        const task = await qStorage.List();
        expect(task).not.empty;

        const deletedTask = await qStorage.PermanentlyDelete(task[0].id!)
        expect(deletedTask.value).true

        return Promise.resolve()
    });


    it('can send event on datasource modify', async()=> {
        const storage = QueueStorage.Instance;
        const dStorage = DataSourceStorage.Instance;

        const updatedDatasource = await dStorage.Update(dataSourceID, "test suite", updateDatasource);
        expect(updatedDatasource.value).true;

        const task = await storage.List();
        expect(task).not.empty;

        const deletedTask = await storage.PermanentlyDelete(task[0].id)
        expect(deletedTask.value).true

        return Promise.resolve()
    });

    it('can send event on data staging import', async()=> {
        const storage = QueueStorage.Instance;
        const dsStorage = DataStagingStorage.Instance;
        const importStorage = ImportStorage.Instance

        let imports = await importStorage.InitiateImport(dataSourceID, "test suite", "test")
        await dsStorage.Create(dataSourceID, imports.value, test_raw_payload)

        let task = await storage.List();
        expect(task).not.empty;

        let deletedTask = await storage.PermanentlyDelete(task[0].id)
        expect(deletedTask.value).true

        return Promise.resolve()
    });

    it('can send event on import complete', async()=> {
        const storage = QueueStorage.Instance;
        const importStorage = ImportStorage.Instance

        let imports = await importStorage.InitiateImport(dataSourceID, "test suite", "test");
        const importSuccess = await importStorage.SetStatus(imports.value, "completed");
        expect(importSuccess.value).true;

        let task = await storage.List();
        expect(task).not.empty;

        let deletedTask = await storage.PermanentlyDelete(task[0].id)
        expect(deletedTask.value).true

        return Promise.resolve()
    });

    it('can send event on data export', async()=> {
        const storage = QueueStorage.Instance;
        const eStorage = ExportStorage.Instance;

        const dataExport = await eStorage.Create(containerID, "test suite", 
            {container_id: containerID, adapter:"gremlin", config: {}})

        expect(dataExport.isError).false;
        expect(dataExport.value).not.empty;

        let task = await storage.List();
        expect(task).not.empty;

        let deletedTask = await storage.PermanentlyDelete(task[0].id)
        expect(deletedTask.value).true

        return Promise.resolve()
    });

    it('can send event on file create and modify', async()=> {
        const storage = QueueStorage.Instance;
        const fStorage = FileStorage.Instance;

        const file = await fStorage.Create("test suite", containerID, dataSourceID,
            {
                file_name: faker.name.findName(),
                file_size: 200,
                md5hash: "",
                adapter_file_path: faker.name.findName(),
                adapter: "filesystem",
            }
        );

        expect(file.isError).false
        expect(file.value).not.empty

        let task = await storage.List();
        expect(task).not.empty;

        let deletedTask = await storage.PermanentlyDelete(task[0].id)
        expect(deletedTask.value).true

        let updateResult = await fStorage.Update(file.value.id!, "test-suite",
            {adapter : 'aws_s3'});
        expect(updateResult.isError).false;

        task = await storage.List();
        expect(task).not.empty;

        deletedTask = await storage.PermanentlyDelete(task[0].id)
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
