/* tslint:disable */
import faker from 'faker'
import {expect} from 'chai'
import PostgresAdapter from "../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import Logger from "../../../services/logger";
import ContainerStorage from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import ContainerMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import DataSourceStorage from "../../../data_access_layer/mappers/data_warehouse/import/data_source_storage";
import TypeMappingStorage from "../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_storage";
import MetatypeMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import MetatypeKeyMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import {objectToShapeHash} from "../../../utilities";
import TypeTransformationStorage from "../../../data_access_layer/mappers/data_warehouse/etl/type_transformation_storage";
import Container from "../../../data_warehouse/ontology/container";
import Metatype from "../../../data_warehouse/ontology/metatype";
import MetatypeKey from "../../../data_warehouse/ontology/metatype_key";

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
        let storage = DataSourceStorage.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await mMapper.Create("test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const shapeHash = objectToShapeHash(test_raw_payload)

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash, test_raw_payload)

        expect(mapping.isError).false


        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be retrieved from storage', async()=> {
        let storage = DataSourceStorage.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const shapeHash = objectToShapeHash(test_raw_payload)

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash, test_raw_payload)

        expect(mapping.isError).false

        let fetched = await mappingStorage.Retrieve(mapping.value.id!)
        expect(fetched.isError).false

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can set active', async()=> {
        let storage = DataSourceStorage.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const shapeHash = objectToShapeHash(test_raw_payload)

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash,test_raw_payload)
        expect(mapping.isError).false

        let set = await mappingStorage.SetActive(mapping.value.id)

        let fetched = await mappingStorage.Retrieve(mapping.value.id!)
        expect(fetched.isError).false
        expect(fetched.value.active).true

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be listed from storage by container and data source', async()=> {
        let storage = DataSourceStorage.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const shapeHash = objectToShapeHash(test_raw_payload)

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash,test_raw_payload)

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
        let storage = DataSourceStorage.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const shapeHash = objectToShapeHash(test_raw_payload)

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash, test_raw_payload)

        expect(mapping.isError).false

        let deleted = await mappingStorage.PermanentlyDelete(mapping.value.id!)
        expect(deleted.value).true

        let fetched = await mappingStorage.Retrieve(mapping.value.id!)
        expect(fetched.isError).true

        return storage.PermanentlyDelete(exp.value.id!)
    });
});

describe('A Data Type Mapping Transformation', async() => {
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
    it('can be saved to storage', async()=> {
        let storage = DataSourceStorage.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const shapeHash = objectToShapeHash(test_raw_payload)

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash,test_raw_payload)
        expect(mapping.isError).false

        let transformation = await TypeTransformationStorage.Instance.Create(mapping.value.id, "test suite", {
            metatype_id: metatype.value.id,
            conditions: [{
               key: "RADIUS",
               operator: "==",
               value: "CIRCLE"
            }],
            keys: [{
                key: "RADIUS",
                metatype_key_id: keys.value[0].id
            }]
        })

        expect(transformation.isError).false


        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be retrieved from storage', async()=> {
        let storage = DataSourceStorage.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const shapeHash = objectToShapeHash(test_raw_payload)

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash,test_raw_payload)
        expect(mapping.isError).false

        let transformation = await TypeTransformationStorage.Instance.Create(mapping.value.id, "test suite", {
            metatype_id: metatype.value.id,
            keys: [{
                key: "RADIUS",
                metatype_key_id: keys.value[0].id
            }]
        })

        expect(transformation.isError).false

        let retrieved = await TypeTransformationStorage.Instance.Retrieve(transformation.value.id!)
        expect(retrieved.isError).false


        // validate that the cache return also works
        retrieved = await TypeTransformationStorage.Instance.Retrieve(transformation.value.id!)
        expect(retrieved.isError).false

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can listed by type mapping id', async()=> {
        let storage = DataSourceStorage.Instance;
        let mMapper = MetatypeMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        let keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const shapeHash = objectToShapeHash(test_raw_payload)

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash,test_raw_payload)
        expect(mapping.isError).false

        let transformation = await TypeTransformationStorage.Instance.Create(mapping.value.id, "test suite", {
            metatype_id: metatype.value.id,
            keys: [{
                key: "RADIUS",
                metatype_key_id: keys.value[0].id
            }]
        })

        expect(transformation.isError).false

        let retrieved = await TypeTransformationStorage.Instance.ListForTypeMapping(mapping.value.id)
        expect(retrieved.isError).false
        expect(retrieved.value).not.empty

        // validate cache fetch works
        retrieved = await TypeTransformationStorage.Instance.ListForTypeMapping(mapping.value.id)
        expect(retrieved.isError).false
        expect(retrieved.value).not.empty


        return storage.PermanentlyDelete(exp.value.id!)
    });
});


export const test_keys: MetatypeKey[] = [
    new MetatypeKey({name: "Test", description: "flower name", required: true, propertyName: "flower_name", dataType: "string"}),
    new MetatypeKey({name: "Test2", description: "color of flower allowed", required: true, propertyName: "color", dataType: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeKey({name: "Test Not Required", description: "not required", required: false, propertyName: "notRequired", dataType: "number"}),
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