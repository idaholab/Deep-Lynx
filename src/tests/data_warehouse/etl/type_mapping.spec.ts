import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../services/logger';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import TypeMappingMapper from '../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';
import NodeMapper from '../../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import ImportMapper from '../../../data_access_layer/mappers/data_warehouse/import/import_mapper';
import DataStagingMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_staging_mapper';
import MetatypeRelationshipMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRelationshipPairMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import EdgeMapper from '../../../data_access_layer/mappers/data_warehouse/data/edge_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeRelationship from '../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipPair from '../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeKey from '../../../domain_objects/data_warehouse/ontology/metatype_key';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import MetatypeRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import {User} from '../../../domain_objects/access_management/user';
import Node from '../../../domain_objects/data_warehouse/data/node';
import Edge from '../../../domain_objects/data_warehouse/data/edge';
import TypeMapping from '../../../domain_objects/data_warehouse/etl/type_mapping';
import TypeMappingRepository from '../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import TypeTransformation, {Condition, KeyMapping} from '../../../domain_objects/data_warehouse/etl/type_transformation';
import Import, {DataStaging} from '../../../domain_objects/data_warehouse/import/import';
import DataStagingRepository from '../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';

describe('A Data Type Mapping can', async () => {
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

        const dstorage = DataSourceMapper.Instance;
        const relationshipMapper = MetatypeRelationshipMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

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
                active: false,
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
            }),
        );
        expect(inserted.isError).false;
        expect(inserted.value.id).not.undefined;

        const stagingRepo = new DataStagingRepository();

        const insertedData = await stagingRepo.where().importID('eq', newImport.value.id).list({limit: 1});
        expect(insertedData.isError).false;
        expect(insertedData.value).not.empty;

        data = insertedData.value[0];

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        return ContainerMapper.Instance.Delete(containerID);
    });

    it('can generate a car node', async () => {
        const car = test_metatypes.find((metatype) => metatype.name === 'Car');
        const carKeys = test_metatypes.find((metatype) => metatype.name === 'Car')!.keys!;
        const carTransformation = new TypeTransformation({
            type_mapping_id: typeMappingID,
            keys: [
                new KeyMapping({
                    key: 'car.id',
                    metatype_key_id: carKeys.find((key) => key.name === 'id')!.id,
                }),
                new KeyMapping({
                    key: 'car.name',
                    metatype_key_id: carKeys.find((key) => key.name === 'name')!.id,
                }),
            ],
            metatype_id: test_metatypes.find((m) => m.name === 'Car')!.id,
            unique_identifier_key: 'car.id',
            container_id: containerID,
            data_source_id: dataSourceID,
        });

        const results = await carTransformation.applyTransformation(data!);

        expect((results.value as Node[])[0].properties).to.have.property('name', 'test car');
        expect((results.value as Node[])[0].properties).to.have.property('id', 'UUID');
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[0].original_data_id).eq('UUID');

        // run through and set the right metatype and container
        results.value.forEach((node: Node | Edge) => {
            (node as Node).container_id = containerID;
            (node as Node).metatype = car;
        });

        const inserted = await NodeMapper.Instance.BulkCreateOrUpdateByCompositeID(user.id!, results.value as Node[]);
        expect(inserted.isError).false;

        return NodeMapper.Instance.Delete(inserted.value[0].id!);
    });

    it('can generate a car node with constant values', async () => {
        const car = test_metatypes.find((metatype) => metatype.name === 'Car');
        const carTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSourceID,
            type_mapping_id: typeMappingID,
            keys: [
                new KeyMapping({
                    value: 'TEST UUID',
                    metatype_key_id: car!.keys!.find((key) => key.name === 'id')!.id!,
                }),
                new KeyMapping({
                    value: 'MOTOROLA',
                    metatype_key_id: car!.keys!.find((key) => key.name === 'name')!.id!,
                }),
            ],
            metatype_id: car!.id,
            unique_identifier_key: 'car.id',
        });

        const results = await carTransformation.applyTransformation(data!);

        expect(Array.isArray(results.value)).true;
        expect(results.value).not.empty;

        expect((results.value as Node[])[0].properties).to.have.property('name', 'MOTOROLA');
        expect((results.value as Node[])[0].properties).to.have.property('id', 'TEST UUID');
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[0].original_data_id).eq('UUID');

        // run through and set the right metatype and container
        results.value.forEach((node: Node | Edge) => {
            (node as Node).container_id = containerID;
            (node as Node).metatype = car;
        });

        const inserted = await NodeMapper.Instance.BulkCreateOrUpdateByCompositeID(user.id!, results.value as Node[]);
        expect(inserted.isError).false;

        return NodeMapper.Instance.Delete(inserted.value[0].id!);
    });

    // this will handle testing the root array function
    it('can generate car maintenance entries', async () => {
        const entry = test_metatypes.find((metatype) => metatype.name === 'Maintenance Entry');
        const maintenanceTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSourceID,
            type_mapping_id: typeMappingID,
            keys: [
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].id',
                    metatype_key_id: entry!.keys!.find((key) => key.name === 'id')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].type',
                    metatype_key_id: entry!.keys!.find((key) => key.name === 'type')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].check_engine_light_flag',
                    metatype_key_id: entry!.keys!.find((key) => key.name === 'check engine light flag')!.id,
                }),
            ],
            metatype_id: entry!.id,
            unique_identifier_key: 'car_maintenance.maintenance_entries.[].id',
            root_array: 'car_maintenance.maintenance_entries',
        });

        const results = await maintenanceTransformation.applyTransformation(data!);

        expect(Array.isArray(results.value)).true;
        expect(results.value.length).eq(2); // a total of two nodes should be created

        expect((results.value as Node[])[0].properties).to.have.property('id', 1);
        expect((results.value as Node[])[0].properties).to.have.property('type', 'oil change');
        expect((results.value as Node[])[0].properties).to.have.property('check_engine_light_flag', true);
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[0].original_data_id).eq('1'); // original IDs are strings

        expect((results.value as Node[])[1].properties).to.have.property('id', 2);
        expect((results.value as Node[])[1].properties).to.have.property('type', 'tire rotation');
        expect((results.value as Node[])[1].properties).to.have.property('check_engine_light_flag', false);
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[1].original_data_id).eq('2'); // original IDs are strings

        // run through and set the right metatype and container
        results.value.forEach((node: Node | Edge) => {
            (node as Node).container_id = containerID;
            (node as Node).metatype = entry;
        });

        const inserted = await NodeMapper.Instance.BulkCreateOrUpdateByCompositeID(user.id!, results.value as Node[]);
        expect(inserted.isError).false;

        await NodeMapper.Instance.Delete(inserted.value[0].id!);
        return NodeMapper.Instance.Delete(inserted.value[1].id!);
    });

    it('can generate parts lists entries', async () => {
        const part = test_metatypes.find((metatype) => metatype.name === 'Part');
        const maintenanceTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSourceID,
            type_mapping_id: typeMappingID,
            keys: [
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].parts_list.[].id',
                    metatype_key_id: part!.keys!.find((key) => key.name === 'id')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].parts_list.[].name',
                    metatype_key_id: part!.keys!.find((key) => key.name === 'name')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].parts_list.[].quantity',
                    metatype_key_id: part!.keys!.find((key) => key.name === 'quantity')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].parts_list.[].price',
                    metatype_key_id: part!.keys!.find((key) => key.name === 'price')!.id,
                }),
            ],
            metatype_id: part!.id,
            unique_identifier_key: 'car_maintenance.maintenance_entries.[].parts_list.[].id',
            root_array: 'car_maintenance.maintenance_entries.[].parts_list',
        });

        const results = await maintenanceTransformation.applyTransformation(data!);

        expect(Array.isArray(results.value)).true;
        expect(results.value.length).eq(5); // a total of two nodes should be created

        expect((results.value as Node[])[0].properties).to.have.property('id', 'oil');
        expect((results.value as Node[])[0].properties).to.have.property('name', 'synthetic oil');
        expect((results.value as Node[])[0].properties).to.have.property('price', 45.66);
        expect((results.value as Node[])[0].properties).to.have.property('quantity', 1);
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[0].original_data_id).eq('oil');

        expect((results.value as Node[])[1].properties).to.have.property('id', 'pan');
        expect((results.value as Node[])[1].properties).to.have.property('name', 'oil pan');
        expect((results.value as Node[])[1].properties).to.have.property('price', 15.5);
        expect((results.value as Node[])[1].properties).to.have.property('quantity', 1);
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[1].original_data_id).eq('pan');

        expect((results.value as Node[])[2].properties).to.have.property('id', 'tire');
        expect((results.value as Node[])[2].properties).to.have.property('name', 'all terrain tire');
        expect((results.value as Node[])[2].properties).to.have.property('price', 150.99);
        expect((results.value as Node[])[2].properties).to.have.property('quantity', 4);
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[2].original_data_id).eq('tire');

        expect((results.value as Node[])[3].properties).to.have.property('id', 'wrench');
        expect((results.value as Node[])[3].properties).to.have.property('name', 'wrench');
        expect((results.value as Node[])[3].properties).to.have.property('price', 4.99);
        expect((results.value as Node[])[3].properties).to.have.property('quantity', 1);
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[3].original_data_id).eq('wrench');

        expect((results.value as Node[])[4].properties).to.have.property('id', 'bolts');
        expect((results.value as Node[])[4].properties).to.have.property('name', 'bolts');
        expect((results.value as Node[])[4].properties).to.have.property('price', 1.99);
        expect((results.value as Node[])[4].properties).to.have.property('quantity', 5);
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[4].original_data_id).eq('bolts');

        // run through and set the right metatype and container
        results.value.forEach((node: Node | Edge) => {
            (node as Node).container_id = containerID;
            (node as Node).metatype = part;
        });

        const inserted = await NodeMapper.Instance.BulkCreateOrUpdateByCompositeID(user.id!, results.value as Node[]);
        expect(inserted.isError).false;

        await NodeMapper.Instance.Delete(inserted.value[0].id!);
        await NodeMapper.Instance.Delete(inserted.value[1].id!);
        await NodeMapper.Instance.Delete(inserted.value[2].id!);
        await NodeMapper.Instance.Delete(inserted.value[3].id!);
        return NodeMapper.Instance.Delete(inserted.value[4].id!);
    });

    it('can generate parts lists entries based on conditions', async () => {
        const part = test_metatypes.find((metatype) => metatype.name === 'Part');
        const maintenanceTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSourceID,
            type_mapping_id: typeMappingID,
            conditions: [
                new Condition({
                    key: 'car.name',
                    operator: '==',
                    value: 'test car',
                    subexpressions: [
                        new Condition({
                            expression: 'AND',
                            key: 'car_maintenance.maintenance_entries.[].parts_list.[].id',
                            operator: '==',
                            value: 'oil',
                        }),
                    ],
                }),
            ],
            keys: [
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].parts_list.[].id',
                    metatype_key_id: part!.keys!.find((key) => key.name === 'id')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].parts_list.[].name',
                    metatype_key_id: part!.keys!.find((key) => key.name === 'name')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].parts_list.[].quantity',
                    metatype_key_id: part!.keys!.find((key) => key.name === 'quantity')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].parts_list.[].price',
                    metatype_key_id: part!.keys!.find((key) => key.name === 'price')!.id,
                }),
            ],
            metatype_id: part!.id,
            unique_identifier_key: 'car_maintenance.maintenance_entries.[].parts_list.[].id',
            root_array: 'car_maintenance.maintenance_entries.[].parts_list',
        });

        const results = await maintenanceTransformation.applyTransformation(data!);

        expect(Array.isArray(results.value)).true;
        expect(results.value.length).eq(1); // a total of two nodes should be created

        expect((results.value as Node[])[0].properties).to.have.property('id', 'oil');
        expect((results.value as Node[])[0].properties).to.have.property('name', 'synthetic oil');
        expect((results.value as Node[])[0].properties).to.have.property('price', 45.66);
        expect((results.value as Node[])[0].properties).to.have.property('quantity', 1);
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[0].original_data_id).eq('oil');

        // run through and set the right metatype and container
        results.value.forEach((node: Node | Edge) => {
            (node as Node).container_id = containerID;
            (node as Node).metatype = part;
        });

        const inserted = await NodeMapper.Instance.BulkCreateOrUpdateByCompositeID(user.id!, results.value as Node[]);
        expect(inserted.isError).false;

        return NodeMapper.Instance.Delete(inserted.value[0].id!);
    });

    // generally testing that our root array can indeed go more than 2 layers deep
    it('can generate component entries', async () => {
        const component = test_metatypes.find((metatype) => metatype.name === 'Component');
        const componentTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSourceID,
            type_mapping_id: typeMappingID,
            keys: [
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].parts_list.[].components.[].id',
                    metatype_key_id: component!.keys!.find((key) => key.name === 'id')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].parts_list.[].components.[].name',
                    metatype_key_id: component!.keys!.find((key) => key.name === 'name')!.id,
                }),
            ],
            metatype_id: component!.id,
            unique_identifier_key: 'car_maintenance.maintenance_entries.[].parts_list.[].components.[].id',
            root_array: 'car_maintenance.maintenance_entries.[].parts_list.[].components',
        });

        const results = await componentTransformation.applyTransformation(data!);

        expect(Array.isArray(results.value)).true;
        expect(results.value.length).eq(1); // a total of two nodes should be created

        expect((results.value as Node[])[0].properties).to.have.property('id', 1);
        expect((results.value as Node[])[0].properties).to.have.property('name', 'oil');
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[0].original_data_id).eq('1');

        // run through and set the right metatype and container
        results.value.forEach((node: Node | Edge) => {
            (node as Node).container_id = containerID;
            (node as Node).metatype = component;
        });

        const inserted = await NodeMapper.Instance.BulkCreateOrUpdateByCompositeID(user.id!, results.value as Node[]);
        expect(inserted.isError).false;

        return NodeMapper.Instance.Delete(inserted.value[0].id!);
    });

    // this will handle testing the root array function
    it('can generate car maintenance entries, and connect them to a maintenance record through edges', async () => {
        const maintenance = test_metatypes.find((metatype) => metatype.name === 'Maintenance');
        const maintenanceTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSourceID,
            type_mapping_id: typeMappingID,
            keys: [
                new KeyMapping({
                    key: 'car_maintenance.id',
                    metatype_key_id: maintenance!.keys!.find((key) => key.name === 'id')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.name',
                    metatype_key_id: maintenance!.keys!.find((key) => key.name === 'name')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.start_date',
                    metatype_key_id: maintenance!.keys!.find((key) => key.name === 'start date')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.average_visits_per_year',
                    metatype_key_id: maintenance!.keys!.find((key) => key.name === 'average visits per year')!.id,
                }),
            ],
            metatype_id: maintenance!.id,
            unique_identifier_key: 'car_maintenance.id',
        });

        const maintenanceResult = await maintenanceTransformation.applyTransformation(data!);

        expect(Array.isArray(maintenanceResult.value)).true;
        expect(maintenanceResult.value.length).eq(1); // a total of two nodes should be created

        expect((maintenanceResult.value as Node[])[0].properties).to.have.property('id', 'UUID');
        expect((maintenanceResult.value as Node[])[0].properties).to.have.property('name', "test car's maintenance");
        expect((maintenanceResult.value as Node[])[0].properties).to.have.property('start_date', '2020-01-01T19:00:00.000Z');
        expect((maintenanceResult.value as Node[])[0].properties).to.have.property('average_visits', 4);
        // validate the original and composite ID fields worked correctly
        expect((maintenanceResult.value as Node[])[0].original_data_id).eq('UUID'); // original IDs are strings

        // run through and set the right metatype and container
        maintenanceResult.value.forEach((node: Node | Edge) => {
            (node as Node).container_id = containerID;
            (node as Node).metatype = maintenance;
        });

        const maintenanceInserted = await NodeMapper.Instance.BulkCreateOrUpdateByCompositeID(user.id!, maintenanceResult.value as Node[]);
        expect(maintenanceInserted.isError).false;

        const entry = test_metatypes.find((metatype) => metatype.name === 'Maintenance Entry');
        const maintenanceEntryTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSourceID,
            type_mapping_id: typeMappingID,
            keys: [
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].id',
                    metatype_key_id: entry!.keys!.find((key) => key.name === 'id')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].type',
                    metatype_key_id: entry!.keys!.find((key) => key.name === 'type')!.id,
                }),
                new KeyMapping({
                    key: 'car_maintenance.maintenance_entries.[].check_engine_light_flag',
                    metatype_key_id: entry!.keys!.find((key) => key.name === 'check engine light flag')!.id,
                }),
            ],
            metatype_id: entry!.id,
            unique_identifier_key: 'car_maintenance.maintenance_entries.[].id',
            root_array: 'car_maintenance.maintenance_entries',
        });

        const results = await maintenanceEntryTransformation.applyTransformation(data!);

        expect(Array.isArray(results.value)).true;
        expect(results.value.length).eq(2); // a total of two nodes should be created

        expect((results.value as Node[])[0].properties).to.have.property('id', 1);
        expect((results.value as Node[])[0].properties).to.have.property('type', 'oil change');
        expect((results.value as Node[])[0].properties).to.have.property('check_engine_light_flag', true);
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[0].original_data_id).eq('1'); // original IDs are strings

        expect((results.value as Node[])[1].properties).to.have.property('id', 2);
        expect((results.value as Node[])[1].properties).to.have.property('type', 'tire rotation');
        expect((results.value as Node[])[1].properties).to.have.property('check_engine_light_flag', false);
        // validate the original and composite ID fields worked correctly
        expect((results.value as Node[])[1].original_data_id).eq('2'); // original IDs are strings

        // run through and set the right metatype and container
        results.value.forEach((node: Node | Edge) => {
            (node as Node).container_id = containerID;
            (node as Node).metatype = entry;
        });

        const inserted = await NodeMapper.Instance.BulkCreateOrUpdateByCompositeID(user.id!, results.value as Node[]);
        expect(inserted.isError).false;

        const maintenanceEdgeTransformation = new TypeTransformation({
            container_id: containerID,
            data_source_id: dataSourceID,
            type_mapping_id: typeMappingID,
            metatype_relationship_pair_id: maintenancePair!.id,
            origin_id_key: 'car_maintenance.id',
            destination_id_key: 'car_maintenance.maintenance_entries.[].id',
            root_array: 'car_maintenance.maintenance_entries',
        });

        const maintenanceEdgeResult = await maintenanceEdgeTransformation.applyTransformation(data!);

        expect(Array.isArray(maintenanceEdgeResult.value)).true;
        expect(maintenanceEdgeResult.value.length).eq(2); // a total of two nodes should be created

        // run through and set the right metatype relationship pair and container
        maintenanceEdgeResult.value.forEach((edge: Node | Edge) => {
            (edge as Edge).container_id = containerID;
            (edge as Edge).metatypeRelationshipPair = maintenancePair;
        });

        const maintenanceEdgeInserted = await EdgeMapper.Instance.BulkCreate('test suite', maintenanceEdgeResult.value as Edge[]);
        expect(maintenanceEdgeInserted.isError).false;

        await NodeMapper.Instance.Delete(maintenanceInserted.value[0].id!);
        await NodeMapper.Instance.Delete(inserted.value[0].id!);
        return NodeMapper.Instance.Delete(inserted.value[1].id!);
    });

    it('apply conditions and subexpressions to a payload correctly', async () => {
        const carNameFalse = new Condition({
            key: 'car.name',
            operator: '==',
            value: 'false',
        });

        expect(TypeTransformation.validTransformationCondition(carNameFalse, test_payload[0])).false;

        const carNameTrue = new Condition({
            key: 'car.name',
            operator: '==',
            value: 'test car',
        });

        expect(TypeTransformation.validTransformationCondition(carNameTrue, test_payload[0])).true;

        const carMaintenanceNested = new Condition({
            key: 'car_maintenance.maintenance_entries.[].type',
            operator: '==',
            value: 'oil change',
        });

        expect(TypeTransformation.validTransformationCondition(carMaintenanceNested, test_payload[0], [0])).true;

        const carNameSubexpressionFalse = new Condition({
            key: 'car.name',
            operator: '==',
            value: 'test car',
            subexpressions: [
                new Condition({
                    expression: 'AND',
                    key: 'car.manufacturer.name',
                    operator: '==',
                    value: 'false',
                }),
            ],
        });

        expect(TypeTransformation.validTransformationCondition(carNameSubexpressionFalse, test_payload[0])).false;

        const carNameSubexpressionTrue = new Condition({
            key: 'car.name',
            operator: '==',
            value: 'test car',
            subexpressions: [
                new Condition({
                    expression: 'AND',
                    key: 'car.manufacturer.name',
                    operator: '==',
                    value: 'Test Cars Inc',
                }),
            ],
        });

        expect(TypeTransformation.validTransformationCondition(carNameSubexpressionTrue, test_payload[0])).true;

        const carNameSubexpressionTrueMultiple = new Condition({
            key: 'car.name',
            operator: '==',
            value: 'test car',
            subexpressions: [
                new Condition({
                    expression: 'AND',
                    key: 'car.manufacturer.name',
                    operator: '==',
                    value: 'Test Cars Inc',
                }),
                new Condition({
                    expression: 'AND',
                    key: 'car.id',
                    operator: '==',
                    value: 'UUID',
                }),
            ],
        });

        expect(TypeTransformation.validTransformationCondition(carNameSubexpressionTrueMultiple, test_payload[0])).true;

        const carNameSubexpressionFalseMultiple = new Condition({
            key: 'car.name',
            operator: '==',
            value: 'test car',
            subexpressions: [
                new Condition({
                    expression: 'AND',
                    key: 'car.manufacturer.name',
                    operator: '==',
                    value: 'false',
                }),
                new Condition({
                    expression: 'AND',
                    key: 'car.id',
                    operator: '==',
                    value: 'UUID',
                }),
            ],
        });

        expect(TypeTransformation.validTransformationCondition(carNameSubexpressionFalseMultiple, test_payload[0])).false;

        const carNameSubexpressionTrueOr = new Condition({
            key: 'car.name',
            operator: '==',
            value: 'false',
            subexpressions: [
                new Condition({
                    expression: 'OR',
                    key: 'car.manufacturer.name',
                    operator: '==',
                    value: 'Test Cars Inc',
                }),
            ],
        });

        expect(TypeTransformation.validTransformationCondition(carNameSubexpressionTrueOr, test_payload[0])).true;

        const carNameSubexpressionTrueOrMultiple = new Condition({
            key: 'car.name',
            operator: '==',
            value: 'false',
            subexpressions: [
                new Condition({
                    expression: 'OR',
                    key: 'car.manufacturer.name',
                    operator: '==',
                    value: 'false',
                }),
                new Condition({
                    expression: 'OR',
                    key: 'car.manufacturer.name',
                    operator: '==',
                    value: 'Test Cars Inc',
                }),
            ],
        });

        expect(TypeTransformation.validTransformationCondition(carNameSubexpressionTrueOrMultiple, test_payload[0])).true;

        const carNameNonEquality = new Condition({
            key: 'car.name',
            operator: '!=',
            value: 'false',
        });

        expect(TypeTransformation.validTransformationCondition(carNameNonEquality, test_payload[0])).true;

        const carNameIn = new Condition({
            key: 'car.name',
            operator: 'in',
            value: 'test car, test',
        });

        expect(TypeTransformation.validTransformationCondition(carNameIn, test_payload[0])).true;

        const carNameInFalse = new Condition({
            key: 'car.name',
            operator: 'in',
            value: 'false, test',
        });

        expect(TypeTransformation.validTransformationCondition(carNameInFalse, test_payload[0])).false;

        const carNameLike = new Condition({
            key: 'car.name',
            operator: 'contains',
            value: 'test',
        });

        expect(TypeTransformation.validTransformationCondition(carNameLike, test_payload[0])).true;

        const carNameLikeFalse = new Condition({
            key: 'car.name',
            operator: 'contains',
            value: 'false',
        });

        expect(TypeTransformation.validTransformationCondition(carNameLikeFalse, test_payload[0])).false;

        const carNameLesserThan = new Condition({
            key: 'car_maintenance.average_visits_per_year',
            operator: '<',
            value: 10,
        });

        expect(TypeTransformation.validTransformationCondition(carNameLesserThan, test_payload[0])).true;

        const carNameLesserThanFalse = new Condition({
            key: 'car_maintenance.average_visits_per_year',
            operator: '<',
            value: 1,
        });

        expect(TypeTransformation.validTransformationCondition(carNameLesserThanFalse, test_payload[0])).false;

        const carNameGreaterThan = new Condition({
            key: 'car_maintenance.average_visits_per_year',
            operator: '>',
            value: 10,
        });

        expect(TypeTransformation.validTransformationCondition(carNameGreaterThan, test_payload[0])).false;

        const carNameGreaterThanFalse = new Condition({
            key: 'car_maintenance.average_visits_per_year',
            operator: '>',
            value: 1,
        });

        expect(TypeTransformation.validTransformationCondition(carNameGreaterThanFalse, test_payload[0])).true;
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
