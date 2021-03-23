/* tslint:disable */
import Logger from "../../../services/logger";
import PostgresAdapter from "../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import ContainerStorage from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import Container from "../../../data_warehouse/ontology/container";
import faker from "faker";
import {expect} from "chai";
import DataSourceStorage from "../../../data_access_layer/mappers/data_warehouse/import/data_source_storage";
import MetatypeMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import MetatypeKeyMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import TypeMappingMapper from "../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper";
import Metatype from "../../../data_warehouse/ontology/metatype";
import TypeMapping from "../../../data_warehouse/etl/type_mapping";
import TypeTransformationMapper from "../../../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper";
import TypeTransformation, {Condition, KeyMapping} from "../../../data_warehouse/etl/type_transformation";
import MetatypeKey from "../../../data_warehouse/ontology/metatype_key";

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
        let mappingStorage = TypeMappingMapper.Instance

        let metatype = await mMapper.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

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


        let mapping = await mappingStorage.Create("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        let transformation = await TypeTransformationMapper.Instance.Create("test suite", new TypeTransformation({
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
        let storage = DataSourceStorage.Instance;
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

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        let mapping = await mappingStorage.Create("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        let transformation = await TypeTransformationMapper.Instance.Create("test suite", new TypeTransformation({
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
        let storage = DataSourceStorage.Instance;
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

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;


        let mapping = await mappingStorage.Create("test suite", new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_raw_payload
        }))

        let transformation = await TypeTransformationMapper.Instance.Create("test suite", new TypeTransformation({
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
