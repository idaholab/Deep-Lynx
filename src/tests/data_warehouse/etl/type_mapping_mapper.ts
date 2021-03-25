/* tslint:disable */
import faker from 'faker'
import {expect} from 'chai'
import PostgresAdapter from "../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import Logger from "../../../services/logger";
import ContainerStorage from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import ContainerMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import DataSourceMapper from "../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper";
import TypeMappingMapper from "../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper";
import MetatypeMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import MetatypeKeyMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import Container from "../../../data_warehouse/ontology/container";
import Metatype from "../../../data_warehouse/ontology/metatype";
import TypeMapping from "../../../data_warehouse/etl/type_mapping";
import MetatypeKey from "../../../data_warehouse/ontology/metatype_key";
import DataSourceRecord from "../../../data_warehouse/import/data_source";

describe('A Data Type Mapping', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

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

        return Promise.resolve()
    });

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('can be saved to storage', async()=> {
        let storage = DataSourceMapper.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingMapper.Instance

        let metatype = await mMapper.Create("test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let mapping = await mappingStorage.Create("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        expect(mapping.isError).false


        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be retrieved from storage', async()=> {
        let storage = DataSourceMapper.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingMapper.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        let mapping = await mappingStorage.Create("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        expect(mapping.isError).false

        let fetched = await mappingStorage.Retrieve(mapping.value.id!)
        expect(fetched.isError).false

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can set active', async()=> {
        let storage = DataSourceMapper.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingMapper.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        let mapping = await mappingStorage.Create("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        let set = await mappingStorage.SetActive(mapping.value.id!)

        let fetched = await mappingStorage.Retrieve(mapping.value.id!)
        expect(fetched.isError).false
        expect(fetched.value.active).true

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be listed from storage by container and data source', async()=> {
        let storage = DataSourceMapper.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingMapper.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        let mapping = await mappingStorage.Create("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        expect(mapping.isError).false

        let fetched = await mappingStorage.List(containerID, exp.value.id!, 0, 100)
        expect(fetched.isError).false
        expect(fetched.value).not.empty

        let fetched2 = await mappingStorage.ListByDataSource(exp.value.id!, 0, 100)
        expect(fetched2.isError).false
        expect(fetched2.value).not.empty

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be deleted from storage', async()=> {
        let storage = DataSourceMapper.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingMapper.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        let mapping = await mappingStorage.Create("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        expect(mapping.isError).false

        let deleted = await mappingStorage.PermanentlyDelete(mapping.value.id!)
        expect(deleted.value).true

        let fetched = await mappingStorage.Retrieve(mapping.value.id!)
        expect(fetched.isError).true

        return storage.PermanentlyDelete(exp.value.id!)
    });
});

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({name: "Test", description: "flower name", required: true, property_name: "flower_name", data_type: "string"}),
    new MetatypeKey({name: "Test2", description: "color of flower allowed", required: true, property_name: "color", data_type: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeKey({name: "Test Not Required", description: "not required", required: false, property_name: "notRequired", data_type: "number"}),
];;

const test_raw_payload = {
    "RAD": 0.1,
    "COLOR": "blue",
    "TYPE": "EQUIP",
    "TEST": "TEST",
    "ITEM_ID": "123",
    "ATTRIBUTES": {
        "WHEELS": 1
    }
}
