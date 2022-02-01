import faker from 'faker';
import {expect} from 'chai';
import TypeMapping from '../../domain_objects/data_warehouse/etl/type_mapping';
import MetatypeRelationship from '../../domain_objects/data_warehouse/ontology/metatype_relationship';
import Import, {DataStaging} from '../../domain_objects/data_warehouse/import/import';
import {User} from '../../domain_objects/access_management/user';
import MetatypeRelationshipPair from '../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeKey from '../../domain_objects/data_warehouse/ontology/metatype_key';
import Metatype from '../../domain_objects/data_warehouse/ontology/metatype';
import Logger from '../../services/logger';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceMapper from '../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import MetatypeRelationshipMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRepository from '../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import MetatypeRelationshipPairMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import DataSourceRecord from '../../domain_objects/data_warehouse/import/data_source';
import TypeMappingRepository from '../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import ImportMapper from '../../data_access_layer/mappers/data_warehouse/import/import_mapper';
import DataStagingMapper from '../../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
import DataStagingRepository from '../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import GraphQLSchemaGenerator from '../../graphql/schema';
import {GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLList, GraphQLEnumType} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import {DataSourceFactory} from '../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import TypeTransformation, {KeyMapping} from '../../domain_objects/data_warehouse/etl/type_transformation';
import TypeTransformationMapper from '../../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper';
import TypeMappingMapper from '../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';
import {ProcessData} from '../../data_processing/process';

describe('The GraphQL Schema Generator', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let typeMappingID: string = '';
    let typeMapping: TypeMapping | undefined;
    let dataSourceID: string = '';
    let resultMetatypeRelationships: MetatypeRelationship[] = [];
    let data: DataStaging | undefined;
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
        new MetatypeKey({
            name: 'drivers',
            property_name: 'drivers',
            description: 'drivers of car',
            data_type: 'list',
            required: true,
        }),
        new MetatypeKey({
            name: 'trim',
            property_name: 'trim',
            description: 'trim package',
            data_type: 'enumeration',
            options: ['le', 'lx'],
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

    const partKeys: MetatypeKey[] = [
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
            keys: partKeys,
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
        const mapper = ContainerMapper.Instance;

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

        const relationshipMapper = MetatypeRelationshipMapper.Instance;

        const metatypeRepo = new MetatypeRepository();
        const created = await metatypeRepo.bulkSave(user, test_metatypes);

        expect(created.isError).false;

        const test_metatype_relationships: MetatypeRelationship[] = [
            new MetatypeRelationship({
                container_id: containerID,
                name: 'parent',
                description: 'item has parent',
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

        const exp = await DataSourceMapper.Instance.Create(
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

        dataSourceID = exp.value.id!;

        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_payload[0],
        });

        const saved = await new TypeMappingRepository().save(mapping, user);

        expect(saved.isError).false;

        typeMappingID = mapping.id!;
        typeMapping = mapping;

        // now import the data
        const newImport = await ImportMapper.Instance.CreateImport(
            'test suite',
            new Import({
                data_source_id: dataSourceID,
                reference: 'testing suite upload',
            }),
        );
        expect(newImport.isError).false;

        const inserted = await DataStagingMapper.Instance.Create(
            new DataStaging({
                data_source_id: dataSourceID,
                import_id: newImport.value.id!,
                data: test_payload[0],
                shape_hash: typeMapping.shape_hash,
            }),
        );
        expect(inserted.isError).false;
        expect(inserted.value.id).not.undefined;

        const stagingRepo = new DataStagingRepository();

        const insertedData = await stagingRepo.where().importID('eq', newImport.value.id).list({limit: 1});
        expect(insertedData.isError).false;
        expect(insertedData.value).not.empty;

        data = insertedData.value[0];

        const dataSource = new DataSourceFactory().fromDataSourceRecord(exp.value);

        // create the transformations and process
        const carMaintenanceKeys = test_metatypes.find((m) => m.name === 'Maintenance')!.keys;
        // first generate all transformations for the type mapping, and set active
        const maintenanceTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSource!.DataSourceRecord!.id!,
            type_mapping_id: typeMappingID,
            keys: [
                new KeyMapping({
                    key: 'car_maintenance.id',
                    metatype_key_id: carMaintenanceKeys!.find((key) => key.name === 'id')?.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.name',
                    metatype_key_id: carMaintenanceKeys!.find((key) => key.name === 'name')?.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.start_date',
                    metatype_key_id: carMaintenanceKeys!.find((key) => key.name === 'start date')?.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.average_visits_per_year',
                    metatype_key_id: carMaintenanceKeys!.find((key) => key.name === 'average visits per year')?.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.visit_dates',
                    metatype_key_id: carMaintenanceKeys!.find((key) => key.name === 'visit dates')?.id,
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
                    metatype_key_id: entryKeys!.find((key) => key.name === 'id')?.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].type',
                    metatype_key_id: entryKeys!.find((key) => key.name === 'type')?.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].check_engine_light_flag',
                    metatype_key_id: entryKeys!.find((key) => key.name === 'check engine light flag')?.id,
                }),
            ],
            metatype_id: test_metatypes.find((m) => m.name === 'Maintenance Entry')?.id,
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

        const dataStagingRepo = new DataStagingRepository();
        const records = await dataStagingRepo.where().dataSourceID('eq', dataSource!.DataSourceRecord!.id).list();
        expect(records.isError).false;
        expect(records.value.length).gt(0);

        for (const record of records.value) {
            const result = await ProcessData(record);
            expect(result.isError, result.error?.error).false;
        }

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can generate a valid schema', async () => {
        const schemaGenerator = new GraphQLSchemaGenerator();

        const containerSchema = await schemaGenerator.ForContainer(containerID);
        expect(containerSchema.isError).false;
        const typeMap = containerSchema.value.getTypeMap();

        // verify the types exist
        expect(typeMap['Garbage']).undefined;
        expect(typeMap['Car']).not.undefined;
        expect(typeMap['Manufacturer']).not.undefined;
        expect(typeMap['Tire_Pressure']).not.undefined;
        expect(typeMap['Maintenance']).not.undefined;
        expect(typeMap['Maintenance_Entry']).not.undefined;
        expect(typeMap['Part']).not.undefined;
        expect(typeMap['Component']).not.undefined;

        // check the fields now, make sure they're the right type
        expect((typeMap['Car'] as GraphQLObjectType).getFields()['id'].type).eq(GraphQLString);
        expect((typeMap['Car'] as GraphQLObjectType).getFields()['name'].type).eq(GraphQLString);
        expect((typeMap['Car'] as GraphQLObjectType).getFields()['drivers'].type.toString).eq(GraphQLList(GraphQLJSON).toString);
        expect((typeMap['Car'] as GraphQLObjectType).getFields()['trim'].type.toString()).eq('Car_trim_Enum_TypeA');
        // check the enum values
        const values = ((typeMap['Car'] as GraphQLObjectType).getFields()['trim'].type as GraphQLEnumType).getValues();
        expect(values.length).eq(2);
        expect(values[0].name).oneOf(['le', 'lx']);
        expect(values[1].name).oneOf(['le', 'lx']);

        expect((typeMap['Manufacturer'] as GraphQLObjectType).getFields()['id'].type).eq(GraphQLString);
        expect((typeMap['Manufacturer'] as GraphQLObjectType).getFields()['name'].type).eq(GraphQLString);
        expect((typeMap['Manufacturer'] as GraphQLObjectType).getFields()['location'].type).eq(GraphQLString);

        expect((typeMap['Tire_Pressure'] as GraphQLObjectType).getFields()['id'].type).eq(GraphQLString);
        expect((typeMap['Tire_Pressure'] as GraphQLObjectType).getFields()['measurement'].type).eq(GraphQLFloat);
        expect((typeMap['Tire_Pressure'] as GraphQLObjectType).getFields()['measurement_unit'].type).eq(GraphQLString);
        expect((typeMap['Tire_Pressure'] as GraphQLObjectType).getFields()['measurement_name'].type).eq(GraphQLString);

        expect((typeMap['Maintenance'] as GraphQLObjectType).getFields()['id'].type).eq(GraphQLString);
        expect((typeMap['Maintenance'] as GraphQLObjectType).getFields()['name'].type).eq(GraphQLString);
        expect((typeMap['Maintenance'] as GraphQLObjectType).getFields()['start_date'].type).eq(GraphQLString);
        expect((typeMap['Maintenance'] as GraphQLObjectType).getFields()['average_visits'].type).eq(GraphQLFloat);

        expect((typeMap['Maintenance_Entry'] as GraphQLObjectType).getFields()['id'].type).eq(GraphQLFloat);
        expect((typeMap['Maintenance_Entry'] as GraphQLObjectType).getFields()['check_engine_light_flag'].type).eq(GraphQLBoolean);
        expect((typeMap['Maintenance_Entry'] as GraphQLObjectType).getFields()['type'].type).eq(GraphQLString);

        expect((typeMap['Part'] as GraphQLObjectType).getFields()['id'].type).eq(GraphQLString);
        expect((typeMap['Part'] as GraphQLObjectType).getFields()['name'].type).eq(GraphQLString);
        expect((typeMap['Part'] as GraphQLObjectType).getFields()['price'].type).eq(GraphQLFloat);
        expect((typeMap['Part'] as GraphQLObjectType).getFields()['quantity'].type).eq(GraphQLFloat);
    });

    // the processed data should generate 1 Maintenance record and 2 Maintenance Entry records by this point
    it('can return nodes based on metadata', async () => {
        const schemaGenerator = new GraphQLSchemaGenerator();

        const containerSchema = await schemaGenerator.ForContainer(containerID);
        expect(containerSchema.isError).false;
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
