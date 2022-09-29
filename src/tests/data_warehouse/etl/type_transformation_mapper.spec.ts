import Logger from '../../../services/logger';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import MetatypeMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import MetatypeKeyMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import TypeMappingMapper from '../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';
import Metatype from '../../../domain_objects/data_warehouse/ontology/metatype';
import TypeMapping from '../../../domain_objects/data_warehouse/etl/type_mapping';
import TypeTransformationMapper from '../../../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper';
import TypeTransformation, {Condition, KeyMapping} from '../../../domain_objects/data_warehouse/etl/type_transformation';
import MetatypeKey from '../../../domain_objects/data_warehouse/ontology/metatype_key';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import MetatypeRelationship from '../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRelationshipPairMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import MetatypeRelationshipPair from '../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import {SuperUser} from '../../../domain_objects/access_management/user';

describe('A Data Type Mapping Transformation', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();
        const mapper = ContainerStorage.Instance;

        const container = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(container.isError).false;
        expect(container.value.id).not.null;
        containerID = container.value.id!;

        return Promise.resolve();
    });

    after(async () => {
        return ContainerMapper.Instance.Delete(containerID);
    });

    it('can be saved to storage', async () => {
        const storage = DataSourceMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const exp = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: exp.value.id!,
                sample_payload: test_raw_payload,
            }),
        );

        const transformation = await TypeTransformationMapper.Instance.Create(
            'test suite',
            new TypeTransformation({
                type_mapping_id: mapping.value.id!,
                metatype_id: metatype.value.id,
                conditions: [
                    new Condition({
                        key: 'RADIUS',
                        operator: '==',
                        value: 'CIRCLE',
                    }),
                ],
                keys: [
                    new KeyMapping({
                        key: 'RADIUS',
                        metatype_key_id: keys.value[0].id,
                    }),
                ],
            }),
        );

        expect(transformation.isError).false;

        return storage.Delete(exp.value.id!);
    });

    it('can be retrieved from storage', async () => {
        const storage = DataSourceMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const exp = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: exp.value.id!,
                sample_payload: test_raw_payload,
            }),
        );

        const transformation = await TypeTransformationMapper.Instance.Create(
            'test suite',
            new TypeTransformation({
                type_mapping_id: mapping.value.id!,
                metatype_id: metatype.value.id,
                keys: [
                    new KeyMapping({
                        key: 'RADIUS',
                        metatype_key_id: keys.value[0].id,
                    }),
                ],
            }),
        );

        expect(transformation.isError).false;

        let retrieved = await TypeTransformationMapper.Instance.Retrieve(transformation.value.id!);
        expect(retrieved.isError).false;

        // validate that the cache return also works
        retrieved = await TypeTransformationMapper.Instance.Retrieve(transformation.value.id!);
        expect(retrieved.isError).false;

        return storage.Delete(exp.value.id!);
    });

    it('can listed by type mapping id', async () => {
        const storage = DataSourceMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const exp = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: exp.value.id!,
                sample_payload: test_raw_payload,
            }),
        );

        const transformation = await TypeTransformationMapper.Instance.Create(
            'test suite',
            new TypeTransformation({
                type_mapping_id: mapping.value.id!,
                metatype_id: metatype.value.id,
                keys: [
                    new KeyMapping({
                        key: 'RADIUS',
                        metatype_key_id: keys.value[0].id,
                    }),
                ],
            }),
        );

        expect(transformation.isError).false;

        let retrieved = await TypeTransformationMapper.Instance.ListForTypeMapping(mapping.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        // validate cache fetch works
        retrieved = await TypeTransformationMapper.Instance.ListForTypeMapping(mapping.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return storage.Delete(exp.value.id!);
    });

    it('can upate a transformation', async () => {
        const storage = DataSourceMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const pairMapper = MetatypeRelationshipPairMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const relationship = await rMapper.Create(
            'test suite',
            new MetatypeRelationship({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        const relationshipPair = await pairMapper.Create(
            'test suite',
            new MetatypeRelationshipPair({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                origin_metatype: metatype.value.id!,
                destination_metatype: metatype.value.id!,
                relationship: relationship.value.id!,
                relationship_type: 'many:many',
            }),
        );

        expect(relationshipPair.isError).false;
        expect(relationshipPair.value).not.empty;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const exp = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: exp.value.id!,
                sample_payload: test_raw_payload,
            }),
        );

        const metatypeTransformation = await TypeTransformationMapper.Instance.Create(
            'test suite',
            new TypeTransformation({
                type_mapping_id: mapping.value.id!,
                metatype_id: metatype.value.id,
                keys: [
                    new KeyMapping({
                        key: 'RADIUS',
                        metatype_key_id: keys.value[0].id,
                    }),
                ],
            }),
        );

        expect(metatypeTransformation.isError).false;

        const updatedMetatypeTransformation = await TypeTransformationMapper.Instance.Update(
            'test suite',
            new TypeTransformation({
                type_mapping_id: mapping.value.id!,
                metatype_id: metatype.value.id,
                keys: [
                    new KeyMapping({
                        key: 'RADIUS',
                        metatype_key_id: keys.value[0].id,
                    }),
                ],
            }),
        );

        expect(updatedMetatypeTransformation.isError).false;

        const relationshipTransformation = await TypeTransformationMapper.Instance.Create(
            'test suite',
            new TypeTransformation({
                type_mapping_id: mapping.value.id!,
                origin_metatype_id: metatype.value.id,
                origin_data_source_id: exp.value.id!,
                destination_metatype_id: metatype.value.id,
                destination_data_source_id: exp.value.id!,
                metatype_relationship_pair_id: relationshipPair.value.id!,
                keys: [
                    new KeyMapping({
                        key: 'RADIUS',
                        metatype_key_id: keys.value[0].id,
                    }),
                ],
            }),
        );

        expect(relationshipTransformation.isError).false;

        const updatedRelationshipTransformation = await TypeTransformationMapper.Instance.Update(
            'test suite',
            new TypeTransformation({
                type_mapping_id: mapping.value.id!,
                origin_metatype_id: metatype.value.id,
                origin_data_source_id: exp.value.id!,
                destination_metatype_id: metatype.value.id,
                destination_data_source_id: exp.value.id!,
                metatype_relationship_pair_id: relationshipPair.value.id!,
                keys: [
                    new KeyMapping({
                        key: 'RADIUS',
                        metatype_key_id: keys.value[0].id,
                    }),
                ],
            }),
        );

        expect(updatedRelationshipTransformation.isError).false;
    });

    it('can be copied to another mapping', async () => {
        const storage = DataSourceMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const exp = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: exp.value.id!,
                sample_payload: test_raw_payload,
            }),
        );

        const mapping2 = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: exp.value.id!,
                sample_payload: test_raw_payload2,
            }),
        );

        const transformation = await TypeTransformationMapper.Instance.Create(
            'test suite',
            new TypeTransformation({
                type_mapping_id: mapping.value.id!,
                metatype_id: metatype.value.id,
                keys: [
                    new KeyMapping({
                        key: 'RADIUS',
                        metatype_key_id: keys.value[0].id,
                    }),
                ],
            }),
        );

        expect(transformation.isError).false;

        let retrieved = await TypeTransformationMapper.Instance.ListForTypeMapping(mapping.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        let copied = await TypeMappingMapper.Instance.CopyTransformations(SuperUser.id!, mapping.value.id!, mapping2.value.id!);
        expect(copied.isError).false;

        let retrieved2 = await TypeTransformationMapper.Instance.ListForTypeMapping(mapping2.value.id!);
        expect(retrieved2.isError).false;
        expect(retrieved2.value).not.empty;

        return storage.Delete(exp.value.id!);
    });

    it('can fetch keys from payload using dot notation', async () => {
        let value = TypeTransformation.getNestedValue('car.id', test_payload[0]);
        expect(value).eq('UUID');

        value = TypeTransformation.getNestedValue('car_maintenance.maintenance_entries.[].id', test_payload[0], [0]);
        expect(value).eq(1);

        value = TypeTransformation.getNestedValue('car_maintenance.maintenance_entries.[].id', test_payload[0], [1]);
        expect(value).eq(2);

        value = TypeTransformation.getNestedValue('car_maintenance.maintenance_entries.[].parts_list.[].id', test_payload[0], [0, 0]);
        expect(value).eq('oil');

        value = TypeTransformation.getNestedValue('car_maintenance.maintenance_entries.[].parts_list.[].id', test_payload[0], [0, 1]);
        expect(value).eq('pan');

        // need to be able to handle undefined without completely crashing
        value = TypeTransformation.getNestedValue('car_main.garbage', test_payload[0], [0, 1]);
        expect(value).undefined;
    });

    it('can convert values from payload type to the type specified on a key', async () => {
        // we don't need much on the metatype key to trigger the conversion, so no need to save them to check conversion
        let conversion = TypeTransformation.convertValue('string', 'test');
        // null on no conversion needed
        expect(conversion).null;

        conversion = TypeTransformation.convertValue('string', 1.2);
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).eq('1.2');

        conversion = TypeTransformation.convertValue('number64', 1);
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).eq('1');

        conversion = TypeTransformation.convertValue('float64', 1.2);
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).eq('1.2');

        conversion = TypeTransformation.convertValue('string', true);
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).eq('true');

        conversion = TypeTransformation.convertValue('number', '1');
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).eq(1);

        conversion = TypeTransformation.convertValue('float', '.02');
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).eq(0.02);

        conversion = TypeTransformation.convertValue('float', '5.600e-3');
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).eq(0.0056);

        conversion = TypeTransformation.convertValue('number', 'false');
        expect(conversion?.errors).not.undefined;

        conversion = TypeTransformation.convertValue('date', new Date());
        expect(conversion?.errors).undefined;

        // should convert to a string
        conversion = TypeTransformation.convertValue('enumeration', 1);
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).eq('1');

        // should convert to an array
        conversion = TypeTransformation.convertValue('list', 1);
        expect(conversion?.errors).undefined;
        expect(Array.isArray(conversion?.converted_value)).true;

        conversion = TypeTransformation.convertValue('list', [1]);
        expect(conversion).null;

        conversion = TypeTransformation.convertValue('boolean', 1);
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).true;

        conversion = TypeTransformation.convertValue('boolean', 0);
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).false;

        conversion = TypeTransformation.convertValue('boolean', 'true');
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).true;

        conversion = TypeTransformation.convertValue('boolean', 'True');
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).true;

        conversion = TypeTransformation.convertValue('boolean', '1');
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).true;

        conversion = TypeTransformation.convertValue('boolean', 'false');
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).false;

        conversion = TypeTransformation.convertValue('boolean', '0');
        expect(conversion?.errors).undefined;
        expect(conversion?.converted_value).false;

        return Promise.resolve();
    });
});

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({
        name: 'Test',
        description: 'flower name',
        required: true,
        property_name: 'flower_name',
        data_type: 'string',
    }),
    new MetatypeKey({
        name: 'Test2',
        description: 'color of flower allowed',
        required: true,
        property_name: 'color',
        data_type: 'enumeration',
        options: ['yellow', 'blue'],
    }),
    new MetatypeKey({
        name: 'Test Not Required',
        description: 'not required',
        required: false,
        property_name: 'notRequired',
        data_type: 'number',
    }),
];

const test_raw_payload = {
    RAD: 0.1,
    COLOR: 'blue',
    TYPE: 'EQUIP',
    TEST: 'TEST',
    ITEM_ID: '123',
    ATTRIBUTES: {
        WHEELS: 1,
    },
};

const test_raw_payload2 = {
    RAD: 0.1,
    TEST2: 'testing',
    COLOR: 'blue',
    TYPE: 'EQUIP',
    TEST: 'TEST',
    ITEM_ID: '123',
    ATTRIBUTES: {
        WHEELS: 1,
    },
};

const test_payload = [
    {
        car: {
            id: 'UUID',
            name: 'test car',
            manufacturer: {
                id: 'UUID',
                name: 'Test Cars Inc',
                location: 'Seattle, WA',
            },
            tire_pressures: [
                {
                    id: 'tire0',
                    measurement_unit: 'PSI',
                    measurement: 35.08,
                    measurement_name: 'tire pressure',
                },
                {
                    id: 'tire1',
                    measurement_unit: 'PSI',
                    measurement: 35.45,
                    measurement_name: 'tire pressure',
                },
                {
                    id: 'tire2',
                    measurement_unit: 'PSI',
                    measurement: 34.87,
                    measurement_name: 'tire pressure',
                },
                {
                    id: 'tire3',
                    measurement_unit: 'PSI',
                    measurement: 37.22,
                    measurement_name: 'tire pressure',
                },
            ],
        },
        car_maintenance: {
            id: 'UUID',
            name: "test car's maintenance",
            start_date: '1/1/2020 12:00:00',
            average_visits_per_year: 4,
            maintenance_entries: [
                {
                    id: 1,
                    check_engine_light_flag: true,
                    type: 'oil change',
                    parts_list: [
                        {
                            id: 'oil',
                            name: 'synthetic oil',
                            price: 45.66,
                            quantity: 1,
                        },
                        {
                            id: 'pan',
                            name: 'oil pan',
                            price: 15.5,
                            quantity: 1,
                        },
                    ],
                },
                {
                    id: 2,
                    check_engine_light_flag: false,
                    type: 'tire rotation',
                    parts_list: [
                        {
                            id: 'tire',
                            name: 'all terrain tire',
                            price: 150.99,
                            quantity: 4,
                        },
                        {
                            id: 'wrench',
                            name: 'wrench',
                            price: 4.99,
                            quantity: 1,
                        },
                        {
                            id: 'bolts',
                            name: 'bolts',
                            price: 1.99,
                            quantity: 5,
                        },
                    ],
                },
            ],
        },
    },
];
