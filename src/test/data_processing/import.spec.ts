/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerStorage from "../../data_storage/container_storage";
import DataSourceStorage from "../../data_storage/import/data_source_storage";
import ImportStorage from "../../data_storage/import/import_storage";
import {objectToShapeHash} from "../../utilities";
import TypeMappingStorage from "../../data_storage/import/type_mapping_storage";
import DataStagingStorage from "../../data_storage/import/data_staging_storage";

describe('A data import', async() => {
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

    it('can be listed', async()=> {
        let storage = DataSourceStorage.Instance;
        let importStorage = ImportStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let newImport = await importStorage.InitiateImport(exp.value.id!, "test suite", "test");
        expect(newImport.isError).false;

        let imports = await importStorage.List(exp.value.id!, 0, 100);
        expect(imports.isError).false;
        expect(imports.value).not.empty;

        return storage.PermanentlyDelete(exp.value.id!)
    });

    // need to test if we can query imports that are incomplete with uninserted data
    it('can be listed by incomplete and uninserted', async()=> {
        let storage = DataSourceStorage.Instance;
        let importStorage = ImportStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let newImport = await importStorage.InitiateImport(exp.value.id!, "test suite", "test");
        expect(newImport.isError).false;

        // mapping needs to be completed in order to get inserted
        const shapeHash = objectToShapeHash(test_payload)
        const mapping = await TypeMappingStorage.Instance.Create(containerID, exp.value.id!, shapeHash, test_payload)

        expect(mapping.isError).false

        const inserted = await DataStagingStorage.Instance.Create(exp.value.id!, newImport.value, mapping.value.id, test_payload)
        expect(inserted.isError).false

        let imports = await importStorage.ListIncompleteWithUninsertedData(exp.value.id!);
        expect(imports.isError).false;
        expect(imports.value).not.empty;

        let set = await importStorage.SetStatus(newImport.value!, "completed")
        expect(set.isError).false

        imports = await importStorage.ListIncompleteWithUninsertedData(exp.value.id!);
        expect(imports.isError).false;
        expect(imports.value).empty;

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('have individual data records errors set', async()=> {
        let storage = DataSourceStorage.Instance;
        let importStorage = ImportStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:true,
                adapter_type:"manual",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let newImport = await importStorage.InitiateImport(exp.value.id!, "test suite", "test");
        expect(newImport.isError).false;

        // mapping needs to be completed in order to get inserted
        const shapeHash = objectToShapeHash(test_payload)
        const mapping = await TypeMappingStorage.Instance.Create(containerID, exp.value.id!, shapeHash, test_payload)

        expect(mapping.isError).false

        const inserted = await DataStagingStorage.Instance.Create(exp.value.id!, newImport.value, mapping.value.id, test_payload)
        expect(inserted.isError).false

        let data = await DataStagingStorage.Instance.List(newImport.value, 0, 1)
        expect(data.isError).false
        expect(data.value).not.empty

        let result = await DataStagingStorage.Instance.AddError(data.value[0].id, "test error")
        expect(result.isError).false

        result = await DataStagingStorage.Instance.AddError(data.value[0].id, "test error 2")
        expect(result.isError).false

        let retrievedData = await DataStagingStorage.Instance.Retrieve(data.value[0].id!)
        expect(retrievedData.isError).false
        expect(retrievedData.value.errors.length).eq(2)

        // now completely rewrite the errors
        result = await DataStagingStorage.Instance.SetErrors(data.value[0].id, [])
        expect(result.isError).false

        retrievedData = await DataStagingStorage.Instance.Retrieve(data.value[0].id!)
        expect(retrievedData.isError).false
        expect(retrievedData.value.errors.length).eq(0)


        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be stopped', async()=> {
        let storage = DataSourceStorage.Instance;
        let importStorage = ImportStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let newImport = await importStorage.InitiateImport(exp.value.id!, "test suite", "test");
        expect(newImport.isError).false;

        let imports = await importStorage.ListReady(exp.value.id!, 0, 100);
        expect(imports.isError).false;
        expect(imports.value).not.empty;

        for(const i of imports.value) {
            let stopped = await importStorage.SetStatus(i.id, "stopped");
            expect(stopped.isError).false;

            let check = await importStorage.Retrieve(i.id);
            expect(check.isError).false;
            expect(check.value.status).eq("stopped")
        }

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be updated with errors', async()=> {
        let storage = DataSourceStorage.Instance;
        let importStorage = ImportStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let newImport = await importStorage.InitiateImport(exp.value.id!, "test suite", "test");
        expect(newImport.isError).false;

        let imports = await importStorage.ListReady(exp.value.id!, 0, 100);
        expect(imports.isError).false;
        expect(imports.value).not.empty;

        for(const i of imports.value) {
            let stopped = await importStorage.SetStatus(i.id,"error", "test error");
            expect(stopped.isError).false;

            let check = await importStorage.Retrieve(i.id);
            expect(check.isError).false;
            expect(check.value.status_message!).not.empty
        }

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be locked for processing', async()=> {
        let storage = DataSourceStorage.Instance;
        let importStorage = ImportStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let newImport = await importStorage.InitiateImport(exp.value.id!, "test suite", "test");
        expect(newImport.isError).false;

        let imports = await importStorage.ListReady(exp.value.id!, 0, 100);
        expect(imports.isError).false;
        expect(imports.value).not.empty;

        for(const i of imports.value) {
            // start the first transaction which will lock the row
            const transaction = await importStorage.startTransaction()

            const importLocked = await importStorage.RetrieveAndLock(i.id, transaction.value)
            expect(importLocked.isError).false
            let stopped = await importStorage.SetStatus(i.id, "stopped", "locked", transaction.value);
            expect(stopped.isError).false;


            // second transaction should have no access to the row currently
            const transaction2 = await importStorage.startTransaction()

            const importLocked2 = await importStorage.RetrieveAndLock(i.id, transaction2.value)
            expect(importLocked2.isError).true

            importStorage.completeTransaction(transaction.value)
            importStorage.completeTransaction(transaction2.value)
        }

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be retrieved by last stopped', async()=> {
        let storage = DataSourceStorage.Instance;
        let importStorage = ImportStorage.Instance;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let newImport = await importStorage.InitiateImport(exp.value.id!, "test suite", "test");
        expect(newImport.isError).false;

        let imports = await importStorage.ListReady(exp.value.id!, 0, 100);
        expect(imports.isError).false;
        expect(imports.value).not.empty;

        for(const i of imports.value) {
            let stopped = await importStorage.SetStatus(i.id, "stopped");
            expect(stopped.isError).false;

            let check = await importStorage.Retrieve(i.id);
            expect(check.isError).false;
            expect(check.value.status).eq("stopped")
        }

        let stopped = await importStorage.RetrieveLast(exp.value.id!);
        expect(stopped.isError).false;

        return storage.PermanentlyDelete(exp.value.id!)
    });
});

const test_payload = {
    test: "test"
}

