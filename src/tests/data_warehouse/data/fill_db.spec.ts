import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../services/logger';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import TypeMappingMapper from '../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';
import MetatypeRelationshipMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRelationshipPairMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import TypeTransformationMapper from '../../../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeRelationship from '../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipPair from '../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeKey from '../../../domain_objects/data_warehouse/ontology/metatype_key';
import MetatypeRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import {User} from '../../../domain_objects/access_management/user';
import NodeRepository from '../../../data_access_layer/repositories/data_warehouse/data/node_repository';
import EdgeRepository from '../../../data_access_layer/repositories/data_warehouse/data/edge_repository';
import TypeMapping from '../../../domain_objects/data_warehouse/etl/type_mapping';
import TypeTransformation, {KeyMapping} from '../../../domain_objects/data_warehouse/etl/type_transformation';
import TypeMappingRepository from '../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';
import {DataSourceFactory} from '../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import {v4 as uuidv4} from 'uuid';
import {Readable} from 'stream';
import {DataSource} from '../../../interfaces_and_impl/data_warehouse/import/data_source';
import DataStagingRepository from '../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import {ProcessData} from '../../../data_processing/process';

// This test will generate a basic ontology and test data, process it, and persist to the database. You must delete
// this data manually - which is why it's disabled by default. This is generally used in a development environment when
// someone needs some basic data
describe('We can generate test data', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let typeMappingID: string = '';
    let typeMapping: TypeMapping | undefined;
    let dataSource: DataSource | undefined;
    let resultMetatypeRelationships: MetatypeRelationship[] = [];
    let user: User;
    let generatedPayload: {[key: string]: any}[] = [];

    let maintenancePair: MetatypeRelationshipPair | undefined;

    const car_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: 'id',
            property_name: 'id',
            description: 'id of car',
            data_type: 'string',
            required: true,
        }),
        new MetatypeKey({
            name: 'name',
            property_name: 'name',
            description: 'name of car',
            data_type: 'string',
            required: true,
        }),
    ];

    const component_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: 'id',
            property_name: 'id',
            description: 'id of car',
            data_type: 'number',
            required: true,
        }),
        new MetatypeKey({
            name: 'name',
            property_name: 'name',
            description: 'name of car',
            data_type: 'string',
            required: true,
        }),
    ];

    const manufacturer_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: 'id',
            property_name: 'id',
            description: 'id of car',
            data_type: 'string',
            required: true,
        }),
        new MetatypeKey({
            name: 'name',
            property_name: 'name',
            description: 'name of car',
            data_type: 'string',
            required: true,
        }),
        new MetatypeKey({
            name: 'location',
            property_name: 'location',
            description: 'location of manufacturer',
            data_type: 'string',
            required: true,
        }),
    ];

    const tire_pressure_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: 'id',
            property_name: 'id',
            description: 'id of car',
            data_type: 'string',
            required: true,
        }),
        new MetatypeKey({
            name: 'measurement',
            property_name: 'measurement',
            description: 'measurement',
            data_type: 'number',
            required: true,
        }),
        new MetatypeKey({
            name: 'measurement unit',
            property_name: 'measurement_unit',
            description: 'unit of measurement',
            data_type: 'string',
            required: true,
        }),
        new MetatypeKey({
            name: 'measurement name',
            property_name: 'measurement_name',
            description: 'name of measurement',
            data_type: 'string',
            required: true,
        }),
    ];

    const car_maintenance_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: 'id',
            property_name: 'id',
            description: 'id of car',
            data_type: 'string',
            required: true,
        }),
        new MetatypeKey({
            name: 'name',
            property_name: 'name',
            description: 'name',
            data_type: 'string',
            required: true,
        }),
        new MetatypeKey({
            name: 'start date',
            property_name: 'start_date',
            description: 'start date',
            data_type: 'date',
            required: true,
        }),
        new MetatypeKey({
            name: 'average visits per year',
            property_name: 'average_visits',
            description: 'average visits per year',
            data_type: 'number',
            required: true,
        }),
        new MetatypeKey({
            name: 'visit dates',
            property_name: 'visit_dates',
            description: 'history of maintenance visits',
            data_type: 'list',
            required: true,
        }),
    ];

    const maintenance_entry_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: 'id',
            property_name: 'id',
            description: 'id',
            data_type: 'number',
            required: true,
        }),
        new MetatypeKey({
            name: 'check engine light flag',
            property_name: 'check_engine_light_flag',
            description: 'check engine light flag',
            data_type: 'boolean',
            required: true,
        }),
        new MetatypeKey({
            name: 'type',
            property_name: 'type',
            description: 'type',
            data_type: 'string',
            required: true,
        }),
    ];

    const car_part_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: 'id',
            property_name: 'id',
            description: 'id of car',
            data_type: 'string',
            required: true,
        }),
        new MetatypeKey({
            name: 'name',
            property_name: 'name',
            description: 'name',
            data_type: 'string',
            required: true,
        }),
        new MetatypeKey({
            name: 'price',
            property_name: 'price',
            description: 'price',
            data_type: 'number',
            required: true,
        }),
        new MetatypeKey({
            name: 'quantity',
            property_name: 'quantity',
            description: 'quantity',
            data_type: 'number',
            required: true,
        }),
    ];

    const test_metatypes: Metatype[] = [
        new Metatype({
            name: 'Car',
            description: 'A Vehicle',
            keys: car_metatype_keys,
        }),
        new Metatype({
            name: 'Manufacturer',
            description: 'Creator of Car',
            keys: manufacturer_metatype_keys,
        }),
        new Metatype({
            name: 'Tire Pressure',
            description: 'Pressure of tire',
            keys: tire_pressure_metatype_keys,
        }),
        new Metatype({
            name: 'Maintenance',
            description: 'Maintenance records',
            keys: car_maintenance_metatype_keys,
        }),
        new Metatype({
            name: 'Maintenance Entry',
            description: 'Maintenance entries',
            keys: maintenance_entry_metatype_keys,
        }),
        new Metatype({
            name: 'Part',
            description: 'Physical part of car',
            keys: car_part_metatype_keys,
        }),
        new Metatype({
            name: 'Component',
            description: 'Base component of part',
            keys: component_metatype_keys,
        }),
    ];

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
            this.skip();
        }

        if (process.env.GENERATE_TEST_DATA !== 'true') {
            this.skip();
        }

        Logger.debug('generating and persisting test data');

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

        test_metatypes.forEach((metatype) => (metatype.container_id = containerID));

        const userResult = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser'],
            }),
        );

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value;

        const dStorage = DataSourceMapper.Instance;
        const relationshipMapper = MetatypeRelationshipMapper.Instance;
        const metatypeRepo = new MetatypeRepository();
        const created = await metatypeRepo.bulkSave(user, test_metatypes);

        expect(created.isError).false;

        const test_metatype_relationships: MetatypeRelationship[] = [
            new MetatypeRelationship({
                container_id: containerID,
                name: 'parent',
                description: "item is another's parent",
            }),
        ];

        // create the relationships
        const metatypeRelationships = await relationshipMapper.BulkCreate('test suite', test_metatype_relationships);

        expect(metatypeRelationships.isError).false;
        expect(metatypeRelationships.value).not.empty;

        resultMetatypeRelationships = metatypeRelationships.value;

        const pairs = await MetatypeRelationshipPairMapper.Instance.Create(
            'test suite',
            new MetatypeRelationshipPair({
                name: 'owns',
                description: 'owns another entity',
                origin_metatype: test_metatypes.find((m) => m.name === 'Maintenance')!.id!,
                destination_metatype: test_metatypes.find((m) => m.name === 'Maintenance Entry')!.id!,
                relationship: resultMetatypeRelationships.find((m) => m.name === 'parent')!.id!,
                relationship_type: 'one:one',
                container_id: containerID,
            }),
        );

        expect(pairs.isError).false;
        expect(pairs.value).not.empty;

        maintenancePair = pairs.value;

        const exp = await dStorage.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: true,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        const dfactory = new DataSourceFactory();
        dataSource = dfactory.fromDataSourceRecord(exp.value);

        const amountToGenerate = process.env.TEST_DATA_NODES ? parseInt(process.env.TEST_DATA_NODES, 10) : 1000;

        for (let i = 0; i < amountToGenerate; i++) {
            generatedPayload.push({
                car: {
                    id: uuidv4(),
                    name: faker.name.firstName(),
                    manufacturer: {
                        id: uuidv4(),
                        name: faker.name.jobArea(),
                        location: faker.address.city(),
                    },
                    tire_pressures: [
                        {
                            id: faker.random.alphaNumeric(),
                            measurement_unit: 'PSI',
                            measurement: Math.random() * 100,
                            measurement_name: 'tire pressure',
                        },
                        {
                            id: faker.random.alphaNumeric(),
                            measurement_unit: 'PSI',
                            measurement: Math.random() * 100,
                            measurement_name: 'tire pressure',
                        },
                        {
                            id: faker.random.alphaNumeric(),
                            measurement_unit: 'PSI',
                            measurement: Math.random() * 100,
                            measurement_name: 'tire pressure',
                        },
                        {
                            id: faker.random.alphaNumeric(),
                            measurement_unit: 'PSI',
                            measurement: Math.random() * 100,
                            measurement_name: 'tire pressure',
                        },
                    ],
                },
                car_maintenance: {
                    id: uuidv4(),
                    name: faker.name.firstName(),
                    start_date: new Date(new Date().getTime() * (Math.random() * 1000)).toDateString(),
                    average_visits_per_year: Math.random() * 10,
                    visit_dates: [
                        new Date(new Date().getTime() * (Math.random() * 1000)).toDateString(),
                        new Date(new Date().getTime() * (Math.random() * 1000)).toDateString(),
                        new Date(new Date().getTime() * (Math.random() * 1000)).toDateString(),
                    ],
                    maintenance_entries: [
                        {
                            id: Math.floor(Math.random() * 100000),
                            check_engine_light_flag: Math.random() > 0.5, // random boolean generation
                            type: 'oil change',
                            parts_list: [
                                {
                                    id: faker.random.alphaNumeric(),
                                    name: 'synthetic oil',
                                    price: Math.random() * 100,
                                    quantity: Math.floor(Math.random() * 10),
                                    components: [
                                        {
                                            id: Math.floor(Math.random() * 1000),
                                            name: 'oil',
                                        },
                                    ],
                                },
                                {
                                    id: faker.random.alphaNumeric(),
                                    name: 'oil pan',
                                    price: Math.random() * 100,
                                    quantity: Math.floor(Math.random() * 10),
                                    components: [],
                                },
                            ],
                        },
                        {
                            id: Math.floor(Math.random() * 100000),
                            check_engine_light_flag: Math.random() > 0.5, // random boolean generation
                            type: 'tire rotation',
                            parts_list: [
                                {
                                    id: faker.random.alphaNumeric(),
                                    name: 'all terrain tire',
                                    price: Math.random() * 100,
                                    quantity: Math.floor(Math.random() * 10),
                                    components: [],
                                },
                                {
                                    id: faker.random.alphaNumeric(),
                                    name: 'wrench',
                                    price: Math.random() * 100,
                                    quantity: Math.floor(Math.random() * 10),
                                    components: [],
                                },
                                {
                                    id: faker.random.alphaNumeric(),
                                    name: 'bolts',
                                    price: Math.random() * 100,
                                    quantity: Math.floor(Math.random() * 10),
                                    components: [],
                                },
                            ],
                        },
                    ],
                },
            });
        }

        // we have to manually create the type mapping because this has since been moved to a standalone process
        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: generatedPayload[0],
        });

        const repo = new TypeMappingRepository();

        const saved = await repo.save(mapping, user);
        expect(saved.isError).false;

        typeMappingID = mapping.id!;
        typeMapping = mapping;

        return dataSource?.ReceiveData(
            new Readable({
                read() {
                    if (generatedPayload.length === 0) this.push(null);
                    else this.push(generatedPayload.shift());
                },
                objectMode: true,
            }),
            user,
            {overrideJsonStream: true, generateShapeHash: true},
        );
    });

    // this will test the full processing of an import
    it('properly generate data', async () => {
        const carMaintenanceKeys = test_metatypes.find((m) => m.name === 'Maintenance')!.keys;
        // first generate all transformations for the type mapping, and set active
        const maintenanceTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSource!.DataSourceRecord!.id!,
            type_mapping_id: typeMappingID,
            keys: [
                new KeyMapping({
                    key: 'car_maintenance.id',
                    metatype_key_id: carMaintenanceKeys!.find((key) => key.name === 'id')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.name',
                    metatype_key_id: carMaintenanceKeys!.find((key) => key.name === 'name')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.start_date',
                    metatype_key_id: carMaintenanceKeys!.find((key) => key.name === 'start date')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.average_visits_per_year',
                    metatype_key_id: carMaintenanceKeys!.find((key) => key.name === 'average visits per year')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.visit_dates',
                    metatype_key_id: carMaintenanceKeys!.find((key) => key.name === 'visit dates')!.id,
                }),
            ],
            metatype_id: test_metatypes.find((m) => m.name === 'Maintenance')!.id,
            unique_identifier_key: 'car_maintenance.id',
        });

        let result = await TypeTransformationMapper.Instance.Create('test suite', maintenanceTransformation);
        expect(result.isError).false;

        const entryKeys = test_metatypes.find((m) => m.name === 'Maintenance Entry')!.keys;

        const maintenanceEntryTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSource!.DataSourceRecord!.id!,
            type_mapping_id: typeMappingID,
            keys: [
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].id',
                    metatype_key_id: entryKeys!.find((key) => key.name === 'id')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].type',
                    metatype_key_id: entryKeys!.find((key) => key.name === 'type')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].check_engine_light_flag',
                    metatype_key_id: entryKeys!.find((key) => key.name === 'check engine light flag')!.id,
                }),
            ],
            metatype_id: test_metatypes.find((m) => m.name === 'Maintenance Entry')!.id,
            unique_identifier_key: 'car_maintenance.maintenance_entries.[].id',
            root_array: 'car_maintenance.maintenance_entries',
        });

        result = await TypeTransformationMapper.Instance.Create('test suite', maintenanceEntryTransformation);
        expect(result.isError).false;

        const maintenanceEdgeTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSource!.DataSourceRecord!.id!,
            type_mapping_id: typeMappingID,
            metatype_relationship_pair_id: maintenancePair!.id,
            origin_id_key: 'car_maintenance.id',
            destination_id_key: 'car_maintenance.maintenance_entries.[].id',
            root_array: 'car_maintenance.maintenance_entries',
            keys: [],
        });

        result = await TypeTransformationMapper.Instance.Create('test suite', maintenanceEdgeTransformation);
        expect(result.isError).false;

        const active = await TypeMappingMapper.Instance.SetActive(typeMappingID);
        expect(active.isError).false;

        const dataStagingRepo = new DataStagingRepository();
        const records = await dataStagingRepo.where().dataSourceID('eq', dataSource!.DataSourceRecord!.id).list();
        expect(records.isError).false;
        expect(records.value.length).gt(0);

        for (const record of records.value) {
            const result = await ProcessData(record);
            expect(result.isError, result.error?.error).false;
        }

        const nodeRepo = new NodeRepository();
        const nodes = await nodeRepo.where().containerID('eq', containerID).list();

        expect(nodes.isError).false;
        expect(nodes.value.length).gt(999);

        const edgeRepo = new EdgeRepository();
        const edges = await edgeRepo.where().containerID('eq', containerID).list();

        expect(edges.isError).false;
        expect(edges.value.length).gt(1);

        return Promise.resolve();
    }).timeout(120000);
});
