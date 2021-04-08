import Logger from "../../../services/logger";
import PostgresAdapter from "../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import ContainerStorage from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import Container from "../../../data_warehouse/ontology/container";
import faker from "faker";
import {expect} from "chai";
import DataSourceMapper from "../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper";
import MetatypeMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import MetatypeKeyMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import TypeMappingMapper from "../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper";
import Metatype from "../../../data_warehouse/ontology/metatype";
import TypeMapping from "../../../data_warehouse/etl/type_mapping";
import TypeTransformationMapper from "../../../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper";
import TypeTransformation, {Condition, KeyMapping} from "../../../data_warehouse/etl/type_transformation";
import MetatypeKey from "../../../data_warehouse/ontology/metatype_key";
import DataSourceRecord from "../../../data_warehouse/import/data_source";
import ContainerMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";

describe('A Data Type Mapping Transformation', async() => {
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

        const transformation = await TypeTransformationMapper.Instance.Create("test suite", new TypeTransformation({
            type_mapping_id: mapping.value.id!,
            metatype_id: metatype.value.id,
            conditions: [new Condition({
                key: "RADIUS",
                operator: "==",
                value: "CIRCLE"
            })],
            keys: [new KeyMapping({
                key: "RADIUS",
                metatype_key_id: keys.value[0].id
            })]
        }))

        expect(transformation.isError).false


        return storage.PermanentlyDelete(exp.value.id!)
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

        const transformation = await TypeTransformationMapper.Instance.Create("test suite", new TypeTransformation({
            type_mapping_id: mapping.value.id!,
            metatype_id: metatype.value.id,
            keys: [new KeyMapping({
                key: "RADIUS",
                metatype_key_id: keys.value[0].id
            })]
        }))

        expect(transformation.isError).false

        let retrieved = await TypeTransformationMapper.Instance.Retrieve(transformation.value.id!)
        expect(retrieved.isError).false


        // validate that the cache return also works
        retrieved = await TypeTransformationMapper.Instance.Retrieve(transformation.value.id!)
        expect(retrieved.isError).false

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can listed by type mapping id', async()=> {
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

        const transformation = await TypeTransformationMapper.Instance.Create("test suite", new TypeTransformation({
            type_mapping_id: mapping.value.id!,
            metatype_id: metatype.value.id,
            keys: [ new KeyMapping({
                key: "RADIUS",
                metatype_key_id: keys.value[0].id
            })]
        }))

        expect(transformation.isError).false

        let retrieved = await TypeTransformationMapper.Instance.ListForTypeMapping(mapping.value.id!)
        expect(retrieved.isError).false
        expect(retrieved.value).not.empty

        // validate cache fetch works
        retrieved = await TypeTransformationMapper.Instance.ListForTypeMapping(mapping.value.id!)
        expect(retrieved.isError).false
        expect(retrieved.value).not.empty


        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('fetch keys from payload using dot notation', async() => {
        let value = TypeTransformation.getNestedValue("car.id", test_payload[0])
        expect(value).eq("UUID")

        value = TypeTransformation.getNestedValue("car_maintenance.maintenance_entries.[].id", test_payload[0], [0])
        expect(value).eq(1)

        value = TypeTransformation.getNestedValue("car_maintenance.maintenance_entries.[].id", test_payload[0], [1])
        expect(value).eq(2)

        value = TypeTransformation.getNestedValue("car_maintenance.maintenance_entries.[].parts_list.[].id", test_payload[0], [0, 0])
        expect(value).eq("oil")

        value = TypeTransformation.getNestedValue("car_maintenance.maintenance_entries.[].parts_list.[].id", test_payload[0], [0, 1])
        expect(value).eq("pan")
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
