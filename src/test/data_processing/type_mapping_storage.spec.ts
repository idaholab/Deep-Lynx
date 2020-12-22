/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerStorage from "../../data_storage/container_storage";
import DataSourceStorage from "../../data_storage/import/data_source_storage";
import TypeMappingStorage from "../../data_storage/import/type_mapping_storage";
import MetatypeStorage from "../../data_storage/metatype_storage";
import MetatypeKeyStorage from "../../data_storage/metatype_key_storage";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import {objectToShapeHash} from "../../utilities";
import TypeTransformationStorage from "../../data_storage/import/type_transformation_storage";

describe('A Data Type Mapping', async() => {
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

    it('can be saved to storage', async()=> {
        let storage = DataSourceStorage.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
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
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
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
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
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
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
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
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
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

        let storage = ContainerStorage.Instance;

        await PostgresAdapter.Instance.init();
        let container = await storage.Create("test suite", {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value[0].id!;

        return Promise.resolve()
    });
    it('can be saved to storage', async()=> {
        let storage = DataSourceStorage.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const shapeHash = objectToShapeHash(test_raw_payload)

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash,test_raw_payload)
        expect(mapping.isError).false

        let transformation = await TypeTransformationStorage.Instance.Create(mapping.value.id, "test suite", {
            metatype_id: metatype.value[0].id,
            conditions: [{
               key: "RADIUS",
               operator: "eq",
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
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const shapeHash = objectToShapeHash(test_raw_payload)

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash,test_raw_payload)
        expect(mapping.isError).false

        let transformation = await TypeTransformationStorage.Instance.Create(mapping.value.id, "test suite", {
            metatype_id: metatype.value[0].id,
            keys: [{
                key: "RADIUS",
                metatype_key_id: keys.value[0].id
            }]
        })

        expect(transformation.isError).false

        let retrieved = await TypeTransformationStorage.Instance.Retrieve(transformation.value.id!)
        expect(retrieved.isError).false


        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can listed by type mapping id', async()=> {
        let storage = DataSourceStorage.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const shapeHash = objectToShapeHash(test_raw_payload)

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash,test_raw_payload)
        expect(mapping.isError).false

        let transformation = await TypeTransformationStorage.Instance.Create(mapping.value.id, "test suite", {
            metatype_id: metatype.value[0].id,
            keys: [{
                key: "RADIUS",
                metatype_key_id: keys.value[0].id
            }]
        })

        expect(transformation.isError).false

        let retrieved = await TypeTransformationStorage.Instance.ListForTypeMapping(mapping.value.id)
        expect(retrieved.isError).false
        expect(retrieved.value).not.empty


        return storage.PermanentlyDelete(exp.value.id!)
    });
});


const test_keys: MetatypeKeyT[] = [
    {
    name: "Radius",
    property_name: "radius",
    required: true,
    description: "radius for a pipe",
    data_type: "number"
    },
    {
        name: "Color",
        property_name: "color",
        required: true,
        description: "color of pipe allowed",
        data_type: "enumeration",
        options: ["yellow", "blue"]
    },
    {
        name: "Not Required",
        property_name: "optional",
        required: false,
        description: "not required",
        data_type: "number",
    },
];

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
