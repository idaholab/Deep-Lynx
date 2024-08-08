import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../services/logger';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import TypeMappingMapper from '../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';
import MetatypeMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import MetatypeKeyMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../../domain_objects/data_warehouse/ontology/metatype';
import TypeMapping from '../../../domain_objects/data_warehouse/etl/type_mapping';
import MetatypeKey from '../../../domain_objects/data_warehouse/ontology/metatype_key';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';
import DataStagingMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
import Import, { DataStaging } from '../../../domain_objects/data_warehouse/import/import';

const crypto = require('crypto');
const flatten = require('flat');

describe('A Data Type Mapping', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let dataSourceID: string = '';
    let metatypeID: string = '';

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
        dataSourceID = exp.value.id!;

        const metatype = await MetatypeMapper.Instance.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;
        metatypeID = metatype.value.id!;

        return Promise.resolve();
    });

    after(async () => {
        await MetatypeMapper.Instance.Delete(metatypeID);
        await DataSourceMapper.Instance.Delete(dataSourceID);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can be saved to storage', async () => {
        const keyStorage = MetatypeKeyMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatypeID));

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: dataSourceID,
                sample_payload: test_raw_payload,
            }),
        );

        expect(mapping.isError).false;

        return Promise.resolve();
    });

    it('can be bulk saved to storage', async () => {
        const keyStorage = MetatypeKeyMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatypeID));

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const mapping = await mappingStorage.BulkCreateOrUpdate('test suite', [
            new TypeMapping({
                container_id: containerID,
                data_source_id: dataSourceID,
                sample_payload: test_raw_payload,
                shape_hash: 'test',
            }),
            new TypeMapping({
                container_id: containerID,
                data_source_id: dataSourceID,
                sample_payload: test_raw_payload,
            }),
        ]);

        expect(mapping.isError).false;

        return Promise.resolve();
    });

    it('can be retrieved from storage', async () => {
        const keyStorage = MetatypeKeyMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatypeID));

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: dataSourceID,
                sample_payload: test_raw_payload,
            }),
        );

        expect(mapping.isError).false;

        const fetched = await mappingStorage.Retrieve(mapping.value.id!);
        expect(fetched.isError).false;

        return Promise.resolve();
    });

    it('can set active', async () => {
        const keyStorage = MetatypeKeyMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatypeID));

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: dataSourceID,
                sample_payload: test_raw_payload,
            }),
        );

        const set = await mappingStorage.SetActive(mapping.value.id!);

        const fetched = await mappingStorage.Retrieve(mapping.value.id!);
        expect(fetched.isError).false;
        expect(fetched.value.active).true;

        return Promise.resolve();
    });

    it('can be deleted from storage', async () => {
        const keyStorage = MetatypeKeyMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatypeID));

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: dataSourceID,
                sample_payload: test_raw_payload,
            }),
        );

        expect(mapping.isError).false;

        const deleted = await mappingStorage.Delete(mapping.value.id!);
        expect(deleted.value).true;

        const fetched = await mappingStorage.Retrieve(mapping.value.id!);
        expect(fetched.isError).true;

        return Promise.resolve();
    });

    it('create valid shape hash of objects with array of objects', async () => {
        const normalHash = TypeMapping.objectToShapeHash(test_payload);
        expect(normalHash).not.null;

        const arrayHash = TypeMapping.objectToShapeHash(test_payload_single_array);
        expect(arrayHash).not.null;
        expect(arrayHash).eq(normalHash);
    });

    it('create valid shape hash of an object while ignoring desired keys', async () => {
        const ignoredFieldHash = TypeMapping.objectToShapeHash(test_payload_single_array, {stop_nodes});
        expect(ignoredFieldHash).not.null;

        const normalHash = TypeMapping.objectToShapeHash(test_payload);
        expect(normalHash).not.null;

        expect(ignoredFieldHash).not.eq(normalHash);

        const normalIgnoredHash = TypeMapping.objectToShapeHash(test_payload_ignored_fields);
        expect(normalIgnoredHash).not.null;
        expect(normalIgnoredHash).eq(ignoredFieldHash);
    });

    it('create valid shape hash of an object while using a key value', async () => { 
        const valueNodesSet = new Set();
        const regularSet = new Set();
        test_payload_value_nodes.forEach(object=>{
            valueNodesSet.add(TypeMapping.objectToRustShapeHash(object, {value_nodes: ['car.id']}))
            regularSet.add(TypeMapping.objectToRustShapeHash(object))
        })

        expect(valueNodesSet.size).eq(2);
        expect(regularSet.size).eq(1);
        expect(valueNodesSet).not.eq(regularSet);
    });

    it('creates valid unique shape hashes of objects with nested arrays if one array is empty', async () => {
        const regularSet = new Set();
        test_payload_nested_array.forEach(object=>{
            regularSet.add(TypeMapping.objectToRustShapeHash(object))
        })

        expect(regularSet).not.null;
        expect(regularSet.size).eq(2);
    });

    it('creates valid unique shape hashes of objects with stop nodes', async () => {
        const stopNodesSet = new Set();
        const regularSet = new Set();
        test_payload_stop_nodes.forEach(object=>{
            stopNodesSet.add(TypeMapping.objectToRustShapeHash(object, {stop_nodes: ['days', 'nickname']}))
            regularSet.add(TypeMapping.objectToRustShapeHash(object))
        })

        expect(stopNodesSet.size).eq(1);
        expect(regularSet.size).eq(3);
        expect(stopNodesSet).not.eq(regularSet);
    });

    it('creates valid unique shape hashes of objects with multiple objects/arrays', async () => {
        const regularSet = new Set();
        test_payload_multiple_object_array.forEach(object=>{
            regularSet.add(TypeMapping.objectToRustShapeHash(object))
        })

        expect(regularSet).not.null;
        expect(regularSet.size).eq(3);
    });

    it('creates valid unique shape hashes of objects with one or multiple of the same shapes and simplifies them to equate', async () => {
        const regularSet = new Set();
        test_payload_multiple_same_simplifier.forEach(object=>{
            regularSet.add(TypeMapping.objectToRustShapeHash(object))
        })

        expect(regularSet).not.null;
        expect(regularSet.size).eq(1);
    });

    it('creates valid unique shape hashes of simple objects', async () => {
        const regularSet = new Set();
        test_payload_simple.forEach(object=>{
            regularSet.add(TypeMapping.objectToRustShapeHash(object))
        })

        expect(regularSet).not.null;
        expect(regularSet.size).eq(1);
    });

    it('creates valid unique shape hashes of simple objects with different data types', async () => {
        const regularSet = new Set();
        test_payload_different_data_types.forEach(object=>{
            regularSet.add(TypeMapping.objectToRustShapeHash(object))
        })

        expect(regularSet).not.null;
        expect(regularSet.size).eq(3);
    });

    it('comparing old Hashes to New Hashes with a simple case', async () => {
        const regularSet: Set<string> = new Set();
        const oldSet: Set<string> = new Set();
        test_payload_simple.forEach(object=>{
            regularSet.add(TypeMapping.objectToRustShapeHash(object))
            oldSet.add(TypeMapping.objectToShapeHash(object))
        })
        const areSetsEqual = compareSets(regularSet, oldSet);
        expect(areSetsEqual).eq(true);
    });

    it('comparing old Hashes to New Hashes with a simple stop node case', async () => {
        const stopNodesSet: Set<string> = new Set();
        const oldSet: Set<string> = new Set();
        test_payload_stop_nodes.forEach(object=>{
            stopNodesSet.add(TypeMapping.objectToRustShapeHash(object, {stop_nodes: ['days', 'nickname']}))
            oldSet.add(TypeMapping.objectToShapeHash(object, {stop_nodes: ['days', 'nickname']}))
        })
        const areSetsEqual = compareSets(stopNodesSet, oldSet);
        expect(areSetsEqual).eq(true);
    });

    it('comparing old Hashes to New Hashes with a simple value nodes case', async () => {
        const regularSet: Set<string> = new Set();
        const oldSet: Set<string> = new Set();
        test_payload_simple.forEach(object=>{
            regularSet.add(TypeMapping.objectToRustShapeHash(object, {value_nodes: ['name']}))
            oldSet.add(TypeMapping.objectToShapeHash(object, {value_nodes: ['name']}))
        })
        const areSetsEqual = compareSets(regularSet, oldSet);
        expect(areSetsEqual).eq(true);
    });

    it('can formulate greatest common payload from array of payloads simple case', async () => {

        const result = TypeMapping.objectToGreatestCommonShape([test_payload_greatest_common_payload_input_one, test_payload_greatest_common_payload_input_two, test_payload_greatest_common_payload_input_three]);

        // Sort the expected output for comparison (result is already sorted in type mapping)
        const sortedExpected = sortObjectKeys(test_payload_greatest_common_payload_output);

        // Assert deep equality
        expect(result).to.deep.equal(sortedExpected);
    });

    it('can formulate greatest common payload from array of payloads advanced case', async () => {

        const result = TypeMapping.objectToGreatestCommonShape([test_payload_value_nodes_one, test_payload_value_nodes_two]);

        // Sort the expected output for comparison (result is already sorted in type mapping)
        const sortedExpected = sortObjectKeys(test_payload_greatest_car_ouput);

        // Assert deep equality
        expect(result).to.deep.equal(sortedExpected);
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

const test_payload_single_array = [
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
                    ],
                },
            ],
        }
    }
];

const test_payload_value_nodes = [
    {
        car: {
            id: "UUID",
            name: "test car",
            manufacturer: {
                id: "UUID",
                name: "Test Cars Inc",
                location: "Seattle, WA"
            },
            tire_pressures: [
                {
                  id: "tire0",
                  measurement_unit: "PSI",
                  measurement: 35.08,
                  measurement_name: "tire pressure"
                }
            ]
        },
        car_maintenance: {
          id: "UUID",
          name: "test cars maintenance",
          start_date: "1/1/2020 12:00:00",
          average_visits_per_year: 4,
          maintenance_entries: [
                {
                  id: 1,
                  check_engine_light_flag: true,
                  type: "oil change",
                  parts_list: [
                        {
                          id: "oil",
                          name: "synthetic oil",
                          price: 45.66,
                          quantity: 1
                        }
                    ]
                },
                {
                  id: 2,
                  check_engine_light_flag: false,
                  type: "tire rotation",
                  parts_list: [
                        {
                          id: "tire",
                          name: "all terrain tire",
                          price: 150.99,
                          quantity: 4
                        }
                    ]
                }
            ]
        }
    },
    {
        car: {
            id: "Honda",
            name: "test car",
            manufacturer: {
                id: "UUID",
                name: "Test Cars Inc",
                location: "Seattle, WA"
            },
            tire_pressures: [
                {
                  id: "tire0",
                  measurement_unit: "PSI",
                  measurement: 35.08,
                  measurement_name: "tire pressure"
                }
            ]
        },
        car_maintenance: {
          id: "UUID",
          name: "test cars maintenance",
          start_date: "1/1/2020 12:00:00",
          average_visits_per_year: 4,
          maintenance_entries: [
                {
                  id: 1,
                  check_engine_light_flag: true,
                  type: "oil change",
                  parts_list: [
                        {
                          id: "oil",
                          name: "synthetic oil",
                          price: 45.66,
                          quantity: 1
                        }
                    ]
                },
                {
                  id: 2,
                  check_engine_light_flag: false,
                  type: "tire rotation",
                  parts_list: [
                        {
                          id: "tire",
                          name: "all terrain tire",
                          price: 150.99,
                          quantity: 4
                        }
                    ]
                }
            ]
        }
    }
];


// @ts-ignore
const stop_nodes = ['tire_pressures', 'check_engine_light_flag'];

// this is exactly like the test_payload minus the keys listed above - this is used to test the shape hash's ignore/stop
// fields property
// @ts-ignore
const test_payload_ignored_fields = [
    {
        car: {
            id: 'UUID',
            name: 'test car',
            manufacturer: {
                id: 'UUID',
                name: 'Test Cars Inc',
                location: 'Seattle, WA',
            },
        },
        car_maintenance: {
            id: 'UUID',
            name: "test car's maintenance",
            start_date: '1/1/2020 12:00:00',
            average_visits_per_year: 4,
            maintenance_entries: [
                {
                    id: 1,
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

const test_payload_nested_array = [
        {
            ManufacturingProcess: {
                keys: {
                      id: "ab9c492-b3f0-412b-ae68-c6dc2e21127d",
                      name: "Test process",
                      description: "an example"
                },
                children: {
                      ArrayOne: [],
                      ArrayTwo: [{id: "123"}, {id: "456"}]
                }
            }
         },
         {
            ManufacturingProcess: {
                keys: {
                      id: "ab9c492-b3f0-412b-ae68-c6dc2e21127d",
                      name: "Test process",
                      description: "an example"
                },
                children: {
                      ArrayOne: [{id: "123"}, {id: "456"}],
                      ArrayTwo: []
                }
            }
         }
];

const test_payload_stop_nodes = [
            {
                objectId: 1,
                name: "EWR-9154-Beartooth_AR_2022_3DView_1:1",
                nickname: "kobe",
                creationDate: "2022-May-31 00:00:00"
            },
            {
                objectId: 2,
                name: "EWR-9154-Beartooth_AR_2022_3DView_2:1",
                creationDate: "2022-May-31 00:00:00",
                days: 4
            },
            {
                objectId: 3,
                name: "EWR-9154-Beartooth_AR_2022_3DView_3:1",
                creationDate: "2022-May-31 00:00:00"
            }
];
     
const test_payload_multiple_object_array = [
        {
            ManufacturingProcess: {
                keys: {
                      id: "ab9c492-b3f0-412b-ae68-c6dc2e21127d",
                      name: "Test process",
                      description: "an example",
                      array: []
                }
            }
         },
         {
            ManufacturingProcess: {
                keys: {
                      id: "ab9c492-b3f0-412b-ae68-c6dc2e21127d",
                      name: "Test process",
                      description: "an example",
                      array: [{has: "stuff"}]
                }
            }
         }, 
         {
           ManufacturingProcess: {
               keys: {
                     id: "ab9c492-b3f0-412b-ae68-c6dc2e21127d",
                     name: "Test process",
                     description: "an example",
                     array: ["thing1", "thing2", "thing3"]
               }
           }
        }
];

const test_payload_multiple_same_simplifier = [
        [
            {id: "1"},
            {id: "2"}
        ],
        [
            {id: "3"}
        ]
];

const test_payload_simple = [
        {
           objectId: 1,
           name: "EWR-9154-Beartooth_AR_2022_3DView_1:1",
           creationDate: "2022-May-31 00:00:00"
        },
        {
           objectId: 2,
           name: "BOB",
           creationDate: "2022-May-31 00:00:00"
        },
        {
           objectId: 3,
           name: "EWR-9154-Beartooth_AR_2022_3DView_3:1",
           creationDate: "2022-May-31 00:00:00"
        }
];    

const test_payload_different_data_types = [
        {
           objectId: 1,
           name: true,
           creationDate: "2022-May-31 00:00:00"
        },
        {
           objectId: 2,
           name: "BOB",
           creationDate: "2022-May-31 00:00:00"
        },
        {
           objectId: 3,
           name: 15,
           creationDate: "2022-May-31 00:00:00"
        }
];

const test_payload_greatest_common_payload_input_one = 
    {
        objectId: 1,
        name: "EWR-9154-Beartooth_AR_2022_3DView_1:1",
        nickname: "kobe",
        creationDate: "2022-May-31 00:00:00",
    };

const test_payload_greatest_common_payload_input_two = 
    {
        objectId: 2,
        name: "EWR-9154-Beartooth_AR_2022_3DView_1:2",
        creationDate: "2022-May-31 00:00:00",
        days: 4
    };

const test_payload_greatest_common_payload_input_three = 
    {
        objectId: 3,
        name: "EWR-9154-Beartooth_AR_2022_3DView_1:3",
        creationDate: "2022-May-31 00:00:00"
    };

const test_payload_greatest_common_payload_output = 
    {
        creationDate: "2022-May-31 00:00:00",
        days: 4,
        name: "EWR-9154-Beartooth_AR_2022_3DView_1:3",
        nickname: "kobe",
        objectId: 3
    };

const test_payload_greatest_car_ouput =
    {
        "car":
            {
                "id":"Honda",
                "manufacturer":
                {
                    "id":"UUID",
                    "location":"Seattle, WA",
                    "name":"Test Cars Inc"
                },
                "name":"test car",
                "tire_pressures":
                [
                    {
                        "id":"tire0",
                        "measurement":35.08,
                        "measurement_name":"tire pressure",
                        "measurement_unit":"PSI"
                    }
                ]
            },
            "car_maintenance":
            {
                "average_visits_per_year":4,
                "id":"UUID",
                "maintenance_entries":
                [
                    {
                        "check_engine_light_flag":true,
                        "id":1,
                        "parts_list":
                        [
                            {
                                "id":"oil",
                                "name":"synthetic oil",
                                "price":45.66,
                                "quantity":1
                            }
                        ],
                        "type":"oil change"
                    },
                    {
                        "check_engine_light_flag":false,
                        "id":2,
                        "parts_list":
                        [
                            {
                                "id":"tire",
                                "name":"all terrain tire",
                                "price":150.99,
                                "quantity":4
                            }
                        ],
                        "type":"tire rotation"
                    }
                ],
                "name":"test cars maintenance",
                "start_date":"1/1/2020 12:00:00"
            }
        };

const test_payload_value_nodes_one = 
    {
        car: {
            id: "UUID",
            name: "test car",
            manufacturer: {
                id: "UUID",
                name: "Test Cars Inc",
                location: "Seattle, WA"
            },
            tire_pressures: [
                {
                  id: "tire0",
                  measurement_unit: "PSI",
                  measurement: 35.08,
                  measurement_name: "tire pressure"
                }
            ]
        },
        car_maintenance: {
          id: "UUID",
          name: "test cars maintenance",
          start_date: "1/1/2020 12:00:00",
          average_visits_per_year: 4,
          maintenance_entries: [
                {
                  id: 1,
                  check_engine_light_flag: true,
                  type: "oil change",
                  parts_list: [
                        {
                          id: "oil",
                          name: "synthetic oil",
                          price: 45.66,
                          quantity: 1
                        }
                    ]
                },
                {
                  id: 2,
                  check_engine_light_flag: false,
                  type: "tire rotation",
                  parts_list: [
                        {
                          id: "tire",
                          name: "all terrain tire",
                          price: 150.99,
                          quantity: 4
                        }
                    ]
                }
            ]
        }
    };
    
const test_payload_value_nodes_two = 
    {
        car: {
            id: "Honda",
            name: "test car",
            manufacturer: {
                id: "UUID",
                name: "Test Cars Inc",
                location: "Seattle, WA"
            },
            tire_pressures: [
                {
                  id: "tire0",
                  measurement_unit: "PSI",
                  measurement: 35.08,
                  measurement_name: "tire pressure"
                }
            ]
        },
        car_maintenance: {
          id: "UUID",
          name: "test cars maintenance",
          start_date: "1/1/2020 12:00:00",
          average_visits_per_year: 4,
          maintenance_entries: [
                {
                  id: 1,
                  check_engine_light_flag: true,
                  type: "oil change",
                  parts_list: [
                        {
                          id: "oil",
                          name: "synthetic oil",
                          price: 45.66,
                          quantity: 1
                        }
                    ]
                },
                {
                  id: 2,
                  check_engine_light_flag: false,
                  type: "tire rotation",
                  parts_list: [
                        {
                          id: "tire",
                          name: "all terrain tire",
                          price: 150.99,
                          quantity: 4
                        }
                    ]
                }
            ]
        }
    };

export class MappingShapeHashOptions {
    stop_nodes?: string[];
    value_nodes?: string[];
    }

// Helper comparison function to compare old and new hasher output
function compareSets(set1: Set<string>, set2: Set<string>): boolean {
    const array1 = Array.from(set1).sort();
    const array2 = Array.from(set2).sort();

    if (array1.length !== array2.length) {
        return false;
    }

    for (let i = 0; i < array1.length; i++) {
        if (array1[i] !== array2[i]) {
            return false;
        }
    }

    return true;
}

// Helper function to sort objects by keys
function sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    } else if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj).sort().reduce((acc, key) => {
            acc[key] = sortObjectKeys(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
}

