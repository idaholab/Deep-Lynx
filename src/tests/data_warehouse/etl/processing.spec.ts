/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import Logger from "../../../services/logger";
import ContainerStorage from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import DataSourceStorage from "../../../data_access_layer/mappers/data_warehouse/import/data_source_storage";
import TypeMappingStorage from "../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_storage";
import {TypeMappingT, TypeTransformationT} from "../../../types/import/typeMappingT";
import MetatypeKeyMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import {objectToShapeHash} from "../../../utilities";
import GraphStorage from "../../../data_access_layer/mappers/data_warehouse/data/graph_storage";
import ImportStorage from "../../../data_access_layer/mappers/data_warehouse/import/import_storage";
import DataStagingStorage from "../../../data_access_layer/mappers/data_warehouse/import/data_staging_storage";
import MetatypeRelationshipMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper";
import MetatypeRelationshipPairMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper";
import {DataSourceT} from "../../../types/import/dataSourceT";
import TypeTransformationStorage from "../../../data_access_layer/mappers/data_warehouse/etl/type_transformation_storage";
import {DataSourceProcessor} from "../../../data_warehouse/etl/processing";
import NodeFilter from "../../../data_access_layer/mappers/data_warehouse/data/node_filter";
import EdgeFilter from "../../../data_access_layer/mappers/data_warehouse/data/edge_filter";
import Container from "../../../data_warehouse/ontology/container";
import Metatype from "../../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import MetatypeRelationship from "../../../data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipPair from "../../../data_warehouse/ontology/metatype_relationship_pair";
import MetatypeKey from "../../../data_warehouse/ontology/metatype_key";
import MetatypeRepository from "../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository";
import {UserT} from "../../../types/user_management/userT";
import UserMapper from "../../../data_access_layer/mappers/access_management/user_mapper";

describe('A Data Processor', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";
    var graphID: string = ""
    var typeMappingID: string = ""
    var typeMapping: TypeMappingT | undefined = undefined
    var dataSource: DataSourceT | undefined = undefined
    var dataImportID: string = ""
    var resultMetatypeRelationships: MetatypeRelationship[] = []
    var user: UserT

    var maintenancePair: MetatypeRelationshipPair | undefined = undefined

    const car_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: "id",
            propertyName: "id",
            description: "id of car",
            dataType: "string",
            required: true
        }),new MetatypeKey({
            name: "name",
            propertyName: "name",
            description: "name of car",
            dataType: "string",
            required: true})]


    const component_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: "id",
            propertyName: "id",
            description: "id of car",
            dataType: "number",
            required: true
        }),new MetatypeKey({
            name: "name",
            propertyName: "name",
            description: "name of car",
            dataType: "string",
            required: true})]

    const manufacturer_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: "id",
            propertyName: "id",
            description: "id of car",
            dataType: "string",
            required: true
        }),new MetatypeKey({
            name: "name",
            propertyName: "name",
            description: "name of car",
            dataType: "string",
            required: true
        }),new MetatypeKey({
            name: "location",
            propertyName: "location",
            description: "location of manufacturer",
            dataType: "string",
            required: true})]


    const tire_pressure_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: "id",
            propertyName: "id",
            description: "id of car",
            dataType: "string",
            required: true
        }), new MetatypeKey({
            name: "measurement",
            propertyName: "measurement",
            description: "measurement",
            dataType: "number",
            required: true
        }),new MetatypeKey({
            name: "measurement unit",
            propertyName: "measurement_unit",
            description: "unit of measurement",
            dataType: "string",
            required: true
        }),new MetatypeKey({
            name: "measurement name",
            propertyName: "measurement_name",
            description: "name of measurement",
            dataType: "string",
            required: true})]


    const car_maintenance_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: "id",
            propertyName: "id",
            description: "id of car",
            dataType: "string",
            required: true
        }),new MetatypeKey({
            name: "name",
            propertyName: "name",
            description: "name",
            dataType: "string",
            required: true
        }),new MetatypeKey({
            name: "start date",
            propertyName: "start_date",
            description: "start date",
            dataType: "date",
            required: true
        }),new MetatypeKey({
            name: "average visits per year",
            propertyName: "average_visits",
            description: "average visits per yera",
            dataType: "number",
            required: true
        })]

    const maintenance_entry_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: "id",
            propertyName: "id",
            description: "id",
            dataType: "number",
            required: true
        }),new MetatypeKey({
            name: "check engine light flag",
            propertyName: "check_engine_light_flag",
            description: "check engine light flag",
            dataType: "boolean",
            required: true
        }), new MetatypeKey({
            name: "type",
            propertyName: "type",
            description: "type",
            dataType: "string",
            required: true
        })]

    const car_part_metatype_keys: MetatypeKey[] = [
        new MetatypeKey({
            name: "id",
            propertyName: "id",
            description: "id of car",
            dataType: "string",
            required: true
        }),new MetatypeKey({
            name: "name",
            propertyName: "name",
            description: "name",
            dataType: "string",
            required: true
        }), new MetatypeKey({
            name: "price",
            propertyName: "price",
            description: "price",
            dataType: "number",
            required: true
        }), new MetatypeKey({
            name: "quantity",
            propertyName: "quantity",
            description: "quantity",
            dataType: "number",
            required: true
        })]

    const test_metatypes: Metatype[] = [
        new Metatype({name: "Car", description: "A Vehicle", keys: car_metatype_keys}),
        new Metatype({name: "Manufacturer", description: "Creator of Car", keys: manufacturer_metatype_keys}),
        new Metatype({name: "Tire Pressure", description: "Pressure of tire", keys: tire_pressure_metatype_keys}),
        new Metatype({name: "Maintenance", description: "Maintenance records", keys: car_maintenance_metatype_keys}),
        new Metatype({name: "Maintenance Entry", description: "Maintenance entries", keys: maintenance_entry_metatype_keys}),
        new Metatype({name: "Part", description: "Physical part of car", keys: car_part_metatype_keys}),
        new Metatype({name: "Component", description: "Base component of part", keys: component_metatype_keys}),
    ];

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

        test_metatypes.forEach(metatype => metatype.container_id = containerID)

        const userResult = await UserMapper.Instance.Create("test suite", (
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"],
                admin: false,
            } as UserT));

        expect(userResult.isError).false
        user = userResult.value

        let graph = await GraphStorage.Instance.Create(containerID, "test suite")
        expect(graph.isError).false;
        graphID = graph.value.id

        let dstorage = DataSourceStorage.Instance;
        let relationshipMapper = MetatypeRelationshipMapper.Instance;
        let mappingStorage = TypeMappingStorage.Instance


        let metatypeRepo = new MetatypeRepository()
        let created = await metatypeRepo.bulkSave(user, test_metatypes)

        expect(created.isError).false;

        const test_metatype_relationships: MetatypeRelationship[] = [
            new MetatypeRelationship({containerID, name: "parent", description: "item is another's parent"})
        ];

        // create the relationships
        let metatypeRelationships = await relationshipMapper.BulkCreate("test suite", test_metatype_relationships)

        expect(metatypeRelationships.isError).false;
        expect(metatypeRelationships.value).not.empty;

        resultMetatypeRelationships = metatypeRelationships.value;

        let pairs = await MetatypeRelationshipPairMapper.Instance.Create("test suite", new MetatypeRelationshipPair({
            "name": "owns",
            "description": "owns another entity",
            "originMetatype": test_metatypes.find(m => m.name === "Maintenance")!.id!,
            "destinationMetatype": test_metatypes.find(m => m.name === "Maintenance Entry")!.id!,
            "relationship": resultMetatypeRelationships.find(m => m.name === "parent")!.id!,
            "relationshipType": "one:one",
            containerID
        }));

        expect(pairs.isError).false;
        expect(pairs.value).not.empty;

        maintenancePair = pairs.value

        let exp = await dstorage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active: true,
                adapter_type:"http",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        dataSource = exp.value

        const shapeHash = objectToShapeHash(test_payload[0])

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash, test_payload[0])

        expect(mapping.isError).false

        typeMappingID = mapping.value.id
        typeMapping = mapping.value

        // now import the data
        const newImport = await ImportStorage.Instance.InitiateImport(exp.value.id!, "test suite", "testing suite upload")
        expect(newImport.isError).false

        dataImportID = newImport.value

        const inserted = await DataStagingStorage.Instance.Create(exp.value.id!, newImport.value, typeMappingID, test_payload[0])
        expect(inserted.isError).false
        expect(inserted.value).true

        return Promise.resolve()
    })

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })

    // this will test the full processing of an import
    it('properly process an import', async() => {
        const carMaintenanceKeys = test_metatypes.find(m => m.name === "Maintenance")!.keys
        // first generate all transformations for the type mapping, and set active
        const maintenanceTransformation = {
            keys: [{
                key: "car_maintenance.id",
                metatype_key_id: carMaintenanceKeys!.find(key => key.name === "id")!.id
            },{
                key: "car_maintenance.name",
                metatype_key_id: carMaintenanceKeys!.find(key => key.name === "name")!.id
            },{
                key: "car_maintenance.start_date",
                metatype_key_id: carMaintenanceKeys!.find(key => key.name === "start date")!.id
            },{
                key: "car_maintenance.average_visits_per_year",
                metatype_key_id: carMaintenanceKeys!.find(key => key.name === "average visits per year")!.id
            }],
            metatype_id: test_metatypes.find(m => m.name === "Maintenance")!.id,
            unique_identifier_key: "car_maintenance.id",
        } as TypeTransformationT

        let result = await TypeTransformationStorage.Instance.Create(typeMappingID, "test suite", maintenanceTransformation)
        expect(result.isError).false

        const entryKeys = test_metatypes.find(m => m.name === "Maintenance Entry")!.keys

        const maintenanceEntryTransformation = {
            keys: [{
                key: "car_maintenance.maintenance_entries.[].id",
                metatype_key_id: entryKeys!.find(key => key.name === "id")!.id
            },{
                key: "car_maintenance.maintenance_entries.[].type",
                metatype_key_id: entryKeys!.find(key => key.name === "type")!.id
            },{
                key: "car_maintenance.maintenance_entries.[].check_engine_light_flag",
                metatype_key_id: entryKeys!.find(key => key.name === "check engine light flag")!.id
            }],
            metatype_id: test_metatypes.find(m => m.name === "Maintenance Entry")!.id,
            unique_identifier_key: "car_maintenance.maintenance_entries.[].id",
            root_array: "car_maintenance.maintenance_entries"
        } as TypeTransformationT

        result = await TypeTransformationStorage.Instance.Create(typeMappingID, "test suite", maintenanceEntryTransformation)
        expect(result.isError).false

        const maintenanceEdgeTransformation = {
            metatype_relationship_pair_id: maintenancePair!.id,
            origin_id_key: "car_maintenance.id",
            destination_id_key: "car_maintenance.maintenance_entries.[].id",
            root_array: "car_maintenance.maintenance_entries",
            keys: []
        } as TypeTransformationT

        result = await TypeTransformationStorage.Instance.Create(typeMappingID, "test suite", maintenanceEdgeTransformation)
        expect(result.isError).false

        const active = await TypeMappingStorage.Instance.SetActive(typeMappingID)
        expect(active.isError).false

        const transaction = await ImportStorage.Instance.startTransaction()

        const dataImport = await ImportStorage.Instance.RetrieveAndLock(dataImportID, transaction.value)
        expect(dataImport.isError).false

        const processor = new DataSourceProcessor(dataSource!,graphID)

        let processed = await processor.process(dataImport.value, transaction.value)
        expect(processed.isError).false
        expect(processed.value).true

        let nodeFilter = new NodeFilter()
        const nodes = await nodeFilter.where().importDataID("eq", dataImportID).all()

        expect(nodes.isError).false
        expect(nodes.value.length).eq(3)

        // run through each node, verifying that the transformations were correctly run
        // I know it's a a double test since we already have tests for the transformations
        // but I wanted to make sure they work in the larger scope of the process loop
        for(const node of nodes.value) {
            switch(node.composite_original_id) {
                case `${containerID}+${dataSource!.id}+car_maintenance.id+UUID`: {
                    expect(node.properties).to.have.property('name', "test car's maintenance")
                    expect(node.properties).to.have.property('start_date', "1/1/2020 12:00:00")
                    expect(node.properties).to.have.property('average_visits', 4)
                    // validate the original and composite ID fields worked correctly
                    expect(node.original_data_id).eq("UUID") // original IDs are strings
                    break;
                }

                case `${containerID}+${dataSource!.id}+car_maintenance.maintenance_entries.[].id+1`: {
                    expect(node.properties).to.have.property('id', 1)
                    expect(node.properties).to.have.property('type', 'oil change')
                    expect(node.properties).to.have.property('check_engine_light_flag', true)
                    // validate the original and composite ID fields worked correctly
                    expect(node.original_data_id).eq("1") // original IDs are strings
                    break;
                }

                case `${containerID}+${dataSource!.id}+car_maintenance.maintenance_entries.[].id+2`: {
                    expect(node.properties).to.have.property('id', 2)
                    expect(node.properties).to.have.property('type', 'tire rotation')
                    expect(node.properties).to.have.property('check_engine_light_flag', false)
                    // validate the original and composite ID fields worked correctly
                    expect(node.original_data_id).eq("2") // original IDs are strings
                    break;
                }

            }
        }

        let edgeFilter = new EdgeFilter()
        const edges = await edgeFilter.where().importDataID("eq", dataImportID).all()

        expect(edges.isError).false
        expect(edges.value.length).eq(2)

        for(const edge of edges.value) {
            switch(edge.destination_node_composite_original_id){
                case `${containerID}+${dataSource!.id}+car_maintenance.maintenance_entries.[].id+1` : {
                    expect(edge.origin_node_composite_original_id).eq(`${containerID}+${dataSource!.id}+car_maintenance.id+UUID`)
                    break;
                }

                case `${containerID}+${dataSource!.id}+car_maintenance.maintenance_entries.[].id+2` : {
                    expect(edge.origin_node_composite_original_id).eq(`${containerID}+${dataSource!.id}+car_maintenance.id+UUID`)
                    break;
                }
            }
        }

        return Promise.resolve()
    })
});


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
                            "quantity": 1,
                            "components": [
                                {
                                    "id": 1,
                                    "name": "oil"
                                }
                            ]
                        },
                        {
                            "id": "pan",
                            "name": "oil pan",
                            "price": 15.50,
                            "quantity": 1,
                            "components": []
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
                            "quantity": 4,
                            "components": []
                        },
                        {
                            "id": "wrench",
                            "name": "wrench",
                            "price": 4.99,
                            "quantity": 1,
                            "components": []
                        },
                        {
                            "id": "bolts",
                            "name": "bolts",
                            "price": 1.99,
                            "quantity": 5,
                            "components": []
                        }
                    ]
                }
            ]
        }
    }
]
