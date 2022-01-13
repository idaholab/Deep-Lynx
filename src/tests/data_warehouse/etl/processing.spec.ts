import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../services/logger';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import TypeMappingMapper from '../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';
import ImportMapper from '../../../data_access_layer/mappers/data_warehouse/import/import_mapper';
import DataStagingMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
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
import Import, {DataStaging} from '../../../domain_objects/data_warehouse/import/import';
import DataSourceRecord, {DataSource} from '../../../domain_objects/data_warehouse/import/data_source';
import {DataSourceFactory} from '../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';

describe('A Data Processor', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let typeMappingID: string = '';
    let typeMapping: TypeMapping | undefined;
    let dataSource: DataSource | undefined;
    let dataImportID: string = '';
    let resultMetatypeRelationships: MetatypeRelationship[] = [];
    let user: User;

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

        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_payload[0],
        });

        const repo = new TypeMappingRepository();

        const saved = await repo.save(mapping, user);

        expect(saved.isError).false;

        typeMappingID = mapping.id!;
        typeMapping = mapping;

        // now import the data
        const newImport = await ImportMapper.Instance.CreateImport(
            'test suite',
            new Import({
                data_source_id: exp.value.id!,
                reference: 'testing suite upload',
            }),
        );
        expect(newImport.isError).false;

        dataImportID = newImport.value.id!;

        const inserted = await DataStagingMapper.Instance.Create(
            new DataStaging({
                data_source_id: exp.value.id!,
                import_id: newImport.value.id!,
                data: test_payload[0],
                shape_hash: mapping.shape_hash,
            }),
        );
        expect(inserted.isError).false;
        expect(inserted.value.id).not.undefined;

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        return ContainerMapper.Instance.Delete(containerID);
    });

    // this will test the full processing of an import
    it('properly process an import', async () => {
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
            origin_data_source_id: dataSource!.DataSourceRecord!.id!,
            origin_metatype_id: test_metatypes.find((m) => m.name === 'Maintenance')!.id,
            destination_id_key: 'car_maintenance.maintenance_entries.[].id',
            destination_data_source_id: dataSource!.DataSourceRecord!.id!,
            destination_metatype_id: test_metatypes.find((m) => m.name === 'Maintenance Entry')!.id,
            root_array: 'car_maintenance.maintenance_entries',
            keys: [],
        });

        result = await TypeTransformationMapper.Instance.Create('test suite', maintenanceEdgeTransformation);
        expect(result.isError).false;

        const active = await TypeMappingMapper.Instance.SetActive(typeMappingID);
        expect(active.isError).false;

        await dataSource!.Process();

        const nodeRepo = new NodeRepository();
        const nodes = await nodeRepo.where().importDataID('eq', dataImportID).list();

        expect(nodes.isError).false;
        expect(nodes.value.length).eq(3);

        // run through each node, verifying that the transformations were correctly run
        // I know it's a a double test since we already have tests for the transformations
        // but I wanted to make sure they work in the larger scope of the process loop
        for (const node of nodes.value) {
            switch (node.original_data_id) {
                case `UUID`: {
                    expect(node.properties).to.have.property('name', "test car's maintenance");
                    expect(node.properties).to.have.property('start_date', '2020-01-01T19:00:00.000Z');
                    expect(node.properties).to.have.property('average_visits', 4);
                    // because the order of the array may have changed, we must check existence and length only
                    expect(node.properties).to.have.property('visit_dates');
                    expect((node.properties as any)['visit_dates'].length).eq(3);
                    // validate the original and composite ID fields worked correctly
                    expect(node.original_data_id).eq('UUID'); // original IDs are strings
                    break;
                }

                case `1`: {
                    expect(node.properties).to.have.property('id', 1);
                    expect(node.properties).to.have.property('type', 'oil change');
                    expect(node.properties).to.have.property('check_engine_light_flag', true);
                    // validate the original and composite ID fields worked correctly
                    expect(node.original_data_id).eq('1'); // original IDs are strings
                    break;
                }

                case `2`: {
                    expect(node.properties).to.have.property('id', 2);
                    expect(node.properties).to.have.property('type', 'tire rotation');
                    expect(node.properties).to.have.property('check_engine_light_flag', false);
                    // validate the original and composite ID fields worked correctly
                    expect(node.original_data_id).eq('2'); // original IDs are strings
                    break;
                }
            }
        }

        const edgeRepo = new EdgeRepository();
        const edges = await edgeRepo.where().importDataID('eq', dataImportID).list();

        expect(edges.isError).false;
        expect(edges.value.length).eq(2);

        return Promise.resolve();
    });
});

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
            visit_dates: ['1/5/2020', '2/20/2020', '3/30/2020'],
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
                            components: [
                                {
                                    id: 1,
                                    name: 'oil',
                                },
                            ],
                        },
                        {
                            id: 'pan',
                            name: 'oil pan',
                            price: 15.5,
                            quantity: 1,
                            components: [],
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
                            components: [],
                        },
                        {
                            id: 'wrench',
                            name: 'wrench',
                            price: 4.99,
                            quantity: 1,
                            components: [],
                        },
                        {
                            id: 'bolts',
                            name: 'bolts',
                            price: 1.99,
                            quantity: 5,
                            components: [],
                        },
                    ],
                },
            ],
        },
    },
];
