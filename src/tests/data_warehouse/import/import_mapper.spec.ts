import faker from 'faker'
import {expect} from 'chai'
import PostgresAdapter from "../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import Logger from "../../../services/logger";
import ContainerStorage from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import ContainerMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import DataSourceMapper from "../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper";
import ImportMapper from "../../../data_access_layer/mappers/data_warehouse/import/import_mapper";
import DataStagingMapper from "../../../data_access_layer/mappers/data_warehouse/import/data_staging_mapper";
import Container from "../../../data_warehouse/ontology/container";
import UserMapper from "../../../data_access_layer/mappers/access_management/user_mapper";
import {User} from "../../../access_management/user";
import TypeMapping from "../../../data_warehouse/etl/type_mapping";
import TypeMappingRepository from "../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository";
import Import, {DataStaging} from "../../../data_warehouse/import/import";
import DataSourceRecord from "../../../data_warehouse/import/data_source";

describe('A data import', async() => {
    let containerID:string = process.env.TEST_CONTAINER_ID || "";
    let user: User

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping export tests, no storage layer");
           this.skip()
       }

       await PostgresAdapter.Instance.init();
       const mapper = ContainerStorage.Instance;

       const container = await mapper.Create("test suite", new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

       expect(container.isError).false;
       expect(container.value.id).not.null
       containerID = container.value.id!;

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

    after(async () => {
        await UserMapper.Instance.Delete(user.id!)
        return ContainerMapper.Instance.Delete(containerID)
    })

    // need to test if we can query imports that are incomplete with uninserted data
    it('can be listed by incomplete and uninserted', async()=> {
        const storage = DataSourceMapper.Instance;
        const importStorage = ImportMapper.Instance;

        const exp = await storage.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active: true,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const newImport = await importStorage.CreateImport( "test suite",  new Import({
            data_source_id: exp.value.id!,
            reference: "testing upload"
        }));
        expect(newImport.isError).false;

        // mapping needs to be completed in order to get inserted
        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_payload
        })

        const saved = await new TypeMappingRepository().save(mapping, user)
        expect(saved.isError).false

        const inserted = await DataStagingMapper.Instance.Create(new DataStaging({
            data_source_id: exp.value.id!,
            import_id: newImport.value.id!,
            mapping_id: mapping.id!,
            data: test_payload
        }))
        expect(inserted.isError).false

        let imports = await importStorage.ListIncompleteWithUninsertedData(exp.value.id!);
        expect(imports.isError).false;
        expect(imports.value).not.empty;

        const set = await importStorage.SetStatus(newImport.value.id!, "completed")
        expect(set.isError).false

        imports = await importStorage.ListIncompleteWithUninsertedData(exp.value.id!);
        expect(imports.isError).false;
        expect(imports.value).empty;

        return storage.Delete(exp.value.id!)
    });

    it('have individual data records errors set', async()=> {
        const storage = DataSourceMapper.Instance;
        const importStorage = ImportMapper.Instance;

        const exp = await storage.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active: true,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const newImport = await importStorage.CreateImport( "test suite",  new Import({
            data_source_id: exp.value.id!,
            reference: "testing upload"
        }));
        expect(newImport.isError).false;

        // mapping needs to be completed in order to get inserted
        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_payload
        })

        const saved = await new TypeMappingRepository().save(mapping, user)
        expect(saved.isError).false

        const inserted = await DataStagingMapper.Instance.Create(new DataStaging({
            data_source_id: exp.value.id!,
            import_id: newImport.value.id!,
            mapping_id: mapping.id!,
            data: test_payload
        }))
        expect(inserted.isError).false

        let result = await DataStagingMapper.Instance.AddError(inserted.value.id!, "test error")
        expect(result.isError).false

        result = await DataStagingMapper.Instance.AddError(inserted.value.id!, "test error 2")
        expect(result.isError).false

        let retrievedData = await DataStagingMapper.Instance.Retrieve(inserted.value.id!)
        expect(retrievedData.isError).false
        expect(retrievedData.value.errors.length).eq(2)

        // now completely rewrite the errors
        result = await DataStagingMapper.Instance.SetErrors(inserted.value.id!, [])
        expect(result.isError).false

        retrievedData = await DataStagingMapper.Instance.Retrieve(inserted.value.id!)
        expect(retrievedData.isError).false
        expect(retrievedData.value.errors.length).eq(0)


        return storage.Delete(exp.value.id!)
    });

    it('can be stopped', async()=> {
        const storage = DataSourceMapper.Instance;
        const importStorage = ImportMapper.Instance;

        const exp = await storage.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active: true,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const newImport = await importStorage.CreateImport( "test suite",  new Import({
            data_source_id: exp.value.id!,
            reference: "testing upload"
        }));
        expect(newImport.isError).false;

        const stopped = await importStorage.SetStatus(newImport.value.id!, "stopped");
        expect(stopped.isError).false;

        const check = await importStorage.Retrieve(newImport.value.id!);
        expect(check.isError).false;
        expect(check.value.status).eq("stopped")

        return storage.Delete(exp.value.id!)
    });

    it('can be updated with errors', async()=> {
        const storage = DataSourceMapper.Instance;
        const importStorage = ImportMapper.Instance;

        const exp = await storage.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active: true,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const newImport = await importStorage.CreateImport( "test suite",  new Import({
            data_source_id: exp.value.id!,
            reference: "testing upload"
        }));
        expect(newImport.isError).false;

        const stopped = await importStorage.SetStatus(newImport.value.id!,"error", "test error");
        expect(stopped.isError).false;

        const check = await importStorage.Retrieve(newImport.value.id!);
        expect(check.isError).false;
        expect(check.value.status_message!).not.empty

        return storage.Delete(exp.value.id!)
    });

    it('can be locked for processing', async()=> {
        const storage = DataSourceMapper.Instance;
        const importStorage = ImportMapper.Instance;

        const exp = await storage.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active: true,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const newImport = await importStorage.CreateImport( "test suite",  new Import({
            data_source_id: exp.value.id!,
            reference: "testing upload"
        }));
        expect(newImport.isError).false;

        // start the first transaction which will lock the row
        const transaction = await importStorage.startTransaction()

        const importLocked = await importStorage.RetrieveAndLock(newImport.value.id!, transaction.value)
        expect(importLocked.isError).false
        const stopped = await importStorage.SetStatus(newImport.value.id!, "stopped", "locked", transaction.value);
        expect(stopped.isError).false;


        // second transaction should have no access to the row currently
        const transaction2 = await importStorage.startTransaction()

        const importLocked2 = await importStorage.RetrieveAndLock(newImport.value.id!, transaction2.value)
        expect(importLocked2.isError).true

        importStorage.completeTransaction(transaction.value)
        importStorage.completeTransaction(transaction2.value)

        return storage.Delete(exp.value.id!)
    });

    it('can be retrieved by last stopped', async()=> {
        const storage = DataSourceMapper.Instance;
        const importStorage = ImportMapper.Instance;

        const exp = await storage.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active: true,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const newImport = await importStorage.CreateImport( "test suite",  new Import({
            data_source_id: exp.value.id!,
            reference: "testing upload"
        }));
        expect(newImport.isError).false;

        const stopped = await importStorage.SetStatus(newImport.value.id!, "stopped");
        expect(stopped.isError).false;

        const check = await importStorage.Retrieve(newImport.value.id!);
        expect(check.isError).false;
        expect(check.value.status).eq("stopped")

        const last = await importStorage.RetrieveLast(exp.value.id!);
        expect(last.isError).false;

        return storage.Delete(exp.value.id!)
    });
});

const test_payload = {
    test: "test"
}

