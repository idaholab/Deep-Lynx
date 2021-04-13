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
    let containerID:string = process.env.TEST_CONTAINER_ID || "";

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

       return Promise.resolve()
    });

    after(async () => {
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('can be saved to storage', async()=> {
        const storage = DataSourceMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance
        const mappingStorage = TypeMappingMapper.Instance

        const metatype = await mMapper.Create("test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        const keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const mapping = await mappingStorage.CreateOrUpdate("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        expect(mapping.isError).false


        return storage.Delete(exp.value.id!)
    });

    it('can be retrieved from storage', async()=> {
        const storage = DataSourceMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance
        const mappingStorage = TypeMappingMapper.Instance

        const metatype = await mMapper.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        const keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        const mapping = await mappingStorage.CreateOrUpdate("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        expect(mapping.isError).false

        const fetched = await mappingStorage.Retrieve(mapping.value.id!)
        expect(fetched.isError).false

        return storage.Delete(exp.value.id!)
    });

    it('can set active', async()=> {
        const storage = DataSourceMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance
        const mappingStorage = TypeMappingMapper.Instance

        const metatype = await mMapper.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        const keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        const mapping = await mappingStorage.CreateOrUpdate("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        const set = await mappingStorage.SetActive(mapping.value.id!)

        const fetched = await mappingStorage.Retrieve(mapping.value.id!)
        expect(fetched.isError).false
        expect(fetched.value.active).true

        return storage.Delete(exp.value.id!)
    });

    it('can be listed from storage by container and data source', async()=> {
        const storage = DataSourceMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance
        const mappingStorage = TypeMappingMapper.Instance

        const metatype = await mMapper.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        const keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        const mapping = await mappingStorage.CreateOrUpdate("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        expect(mapping.isError).false

        const fetched = await mappingStorage.List(containerID, exp.value.id!, 0, 100)
        expect(fetched.isError).false
        expect(fetched.value).not.empty

        const fetched2 = await mappingStorage.ListByDataSource(exp.value.id!, 0, 100)
        expect(fetched2.isError).false
        expect(fetched2.value).not.empty

        return storage.Delete(exp.value.id!)
    });

    it('can be deleted from storage', async()=> {
        const storage = DataSourceMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance
        const mappingStorage = TypeMappingMapper.Instance

        const metatype = await mMapper.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys]
        testKeys.forEach(key => key.metatype_id = metatype.value.id!)

        const keys = await keyStorage.BulkCreate("test suite", testKeys);
        expect(keys.isError).false;

        const exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        const mapping = await mappingStorage.CreateOrUpdate("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        expect(mapping.isError).false

        const deleted = await mappingStorage.Delete(mapping.value.id!)
        expect(deleted.value).true

        const fetched = await mappingStorage.Retrieve(mapping.value.id!)
        expect(fetched.isError).true

        return storage.Delete(exp.value.id!)
    });

    it('create valid shape hash of objects with array of objects', async() => {
        const normalHash = TypeMapping.objectToShapeHash(test_payload)
        expect(normalHash).not.null

        const arrayHash = TypeMapping.objectToShapeHash(test_payload_single_array)
        expect(arrayHash).eq(normalHash)
    })
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
const test_payload = [
    {
        "car": {
            "id": "UUID",
            "name": "test car",
            "manufacturer": {
                "id": "UUID",
                "name": "Test Cars Inc",
                "location": "Seattle, WA"
            },
            "tire_pressures": [
                {
                    "id": "tire0",
                    "measurement_unit": "PSI",
                    "measurement": 35.08,
                    "measurement_name": "tire pressure"
                },
                {
                    "id": "tire1",
                    "measurement_unit": "PSI",
                    "measurement": 35.45,
                    "measurement_name": "tire pressure"
                },
                {
                    "id": "tire2",
                    "measurement_unit": "PSI",
                    "measurement": 34.87,
                    "measurement_name": "tire pressure"
                },
                {
                    "id": "tire3",
                    "measurement_unit": "PSI",
                    "measurement": 37.22,
                    "measurement_name": "tire pressure"
                }
            ]
        },
        "car_maintenance": {
            "id": "UUID",
            "name": "test car's maintenance",
            "start_date": "1/1/2020 12:00:00",
            "average_visits_per_year": 4,
            "maintenance_entries": [
                {
                    "id": 1,
                    "check_engine_light_flag": true,
                    "type": "oil change",
                    "parts_list": [
                        {
                            "id": "oil",
                            "name": "synthetic oil",
                            "price": 45.66,
                            "quantity": 1
                        },
                        {
                            "id": "pan",
                            "name": "oil pan",
                            "price": 15.50,
                            "quantity": 1
                        }
                    ]
                },
                {
                    "id": 2,
                    "check_engine_light_flag": false,
                    "type": "tire rotation",
                    "parts_list": [
                        {
                            "id": "tire",
                            "name": "all terrain tire",
                            "price": 150.99,
                            "quantity": 4
                        },
                        {
                            "id": "wrench",
                            "name": "wrench",
                            "price": 4.99,
                            "quantity": 1
                        },
                        {
                            "id": "bolts",
                            "name": "bolts",
                            "price": 1.99,
                            "quantity": 5
                        }
                    ]
                }
            ]
        }
    }
]


const test_payload_single_array = [
    {
        "car": {
            "id": "UUID",
            "name": "test car",
            "manufacturer": {
                "id": "UUID",
                "name": "Test Cars Inc",
                "location": "Seattle, WA"
            },
            "tire_pressures": [
                {
                    "id": "tire0",
                    "measurement_unit": "PSI",
                    "measurement": 35.08,
                    "measurement_name": "tire pressure"
                }
            ]
        },
        "car_maintenance": {
            "id": "UUID",
            "name": "test car's maintenance",
            "start_date": "1/1/2020 12:00:00",
            "average_visits_per_year": 4,
            "maintenance_entries": [
                {
                    "id": 1,
                    "check_engine_light_flag": true,
                    "type": "oil change",
                    "parts_list": [
                        {
                            "id": "oil",
                            "name": "synthetic oil",
                            "price": 45.66,
                            "quantity": 1
                        }
                    ]
                },
                {
                    "id": 2,
                    "check_engine_light_flag": false,
                    "type": "tire rotation",
                    "parts_list": [
                        {
                            "id": "tire",
                            "name": "all terrain tire",
                            "price": 150.99,
                            "quantity": 4
                        }
                    ]
                }
            ]
        }
    }
]
