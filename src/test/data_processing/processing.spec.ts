/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_mappers/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import DataSourceStorage from "../../data_mappers/import/data_source_storage";
import TypeMappingStorage from "../../data_mappers/import/type_mapping_storage";
import {TypeMappingT, TypeTransformationT} from "../../types/import/typeMappingT";
import MetatypeStorage from "../../data_mappers/metatype_storage";
import MetatypeKeyStorage from "../../data_mappers/metatype_key_storage";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import {objectToShapeHash} from "../../utilities";
import {MetatypeT} from "../../types/metatypeT";
import GraphStorage from "../../data_mappers/graph/graph_storage";
import ImportStorage from "../../data_mappers/import/import_storage";
import DataStagingStorage from "../../data_mappers/import/data_staging_storage";
import {MetatypeRelationshipT} from "../../types/metatype_relationshipT";
import MetatypeRelationshipStorage from "../../data_mappers/metatype_relationship_storage";
import MetatypeRelationshipPairStorage from "../../data_mappers/metatype_relationship_pair_storage";
import {MetatypeRelationshipPairT} from "../../types/metatype_relationship_pairT";
import {DataSourceT} from "../../types/import/dataSourceT";
import TypeTransformationStorage from "../../data_mappers/import/type_transformation_storage";
import {DataSourceProcessor} from "../../data_processing/processing";
import NodeFilter from "../../data_mappers/graph/node_filter";
import EdgeFilter from "../../data_mappers/graph/edge_filter";
import Container from "../../data_warehouse/ontology/container";

describe('A Data Processor', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";
    var graphID: string = ""
    var typeMappingID: string = ""
    var typeMapping: TypeMappingT | undefined = undefined
    var dataSource: DataSourceT | undefined = undefined
    var dataImportID: string = ""
    var resultMetatypes: MetatypeT[] = []
    var resultMetatypeRelationships: MetatypeRelationshipT[] = []

    var carKeys: MetatypeKeyT[] = []
    var manufacturerKeys: MetatypeKeyT[] = []
    var tirePressureKeys: MetatypeKeyT[] = []
    var maintenanceEntryKeys: MetatypeKeyT[] = []
    var maintenanceKeys: MetatypeKeyT[] = []
    var partKeys: MetatypeKeyT[] = []
    var componentKeys : MetatypeKeyT[] = []
    var maintenancePair: MetatypeRelationshipPairT | undefined = undefined


    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping export tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init();
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container(faker.name.findName(), faker.random.alphaNumeric()));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        let graph = await GraphStorage.Instance.Create(containerID, "test suite")
        expect(graph.isError).false;
        graphID = graph.value.id

        let dstorage = DataSourceStorage.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let relationshipStorage = MetatypeRelationshipStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatypes = await metatypeStorage.Create(containerID, "test suite", test_metatypes);

        expect(metatypes.isError).false;
        expect(metatypes.value).not.empty;

        resultMetatypes = metatypes.value

        // run through resulting metatypes adding in the keys based on metatype
        for(const metatype of metatypes.value) {
            switch(metatype.name) {
                case "Car": {
                    const keys = await keyStorage.Create(metatype.id!, "test suite", car_metatype_keys)
                    expect(keys.isError).false

                    carKeys = keys.value
                    break;
                }

                case "Manufacturer": {
                    const keys = await keyStorage.Create(metatype.id!, "test suite", manufacturer_metatype_keys)
                    expect(keys.isError).false

                    manufacturerKeys = keys.value
                    break;
                }

                case "Tire Pressure": {
                    const keys = await keyStorage.Create(metatype.id!, "test suite", tire_pressure_metatype_keys)
                    expect(keys.isError).false

                    tirePressureKeys = keys.value
                    break;
                }

                case "Maintenance Entry": {
                    const keys = await keyStorage.Create(metatype.id!, "test suite", maintenance_entry_metatype_keys)
                    expect(keys.isError).false

                    maintenanceEntryKeys = keys.value
                    break;
                }

                case "Maintenance": {
                    const keys = await keyStorage.Create(metatype.id!, "test suite", car_maintenance_metatype_keys)
                    expect(keys.isError).false

                    maintenanceKeys = keys.value
                    break;
                }

                case "Part": {
                    const keys = await keyStorage.Create(metatype.id!, "test suite", car_part_metatype_keys)
                    expect(keys.isError).false

                    partKeys = keys.value
                    break;
                }

                case "Component": {
                    const keys = await keyStorage.Create(metatype.id!, "test suite", component_metatype_keys)
                    expect(keys.isError).false

                    componentKeys = keys.value
                    break;
                }
            }
        }

        // create the relationships
        let metatypeRelationships = await relationshipStorage.Create(containerID, "test suite", test_metatype_relationships)

        expect(metatypeRelationships.isError).false;
        expect(metatypeRelationships.value).not.empty;

        resultMetatypeRelationships = metatypeRelationships.value;

        let pairs = await MetatypeRelationshipPairStorage.Instance.Create(containerID, "test suite", {
            "name": "owns",
            "description": "owns another entity",
            "origin_metatype_id": resultMetatypes.find(m => m.name === "Maintenance")!.id,
            "destination_metatype_id": resultMetatypes.find(m => m.name === "Maintenance Entry")!.id,
            "relationship_id": resultMetatypeRelationships.find(m => m.name === "parent")!.id,
            "relationship_type": "one:one"
        });

        expect(pairs.isError).false;
        expect(pairs.value).not.empty;

        maintenancePair = pairs.value[0]

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

    // this will test the full processing of an import
    it('properly process an import', async() => {
        // first generate all transformations for the type mapping, and set active
        const maintenanceTransformation = {
            keys: [{
                key: "car_maintenance.id",
                metatype_key_id: maintenanceKeys.find(key => key.name === "id")!.id
            },{
                key: "car_maintenance.name",
                metatype_key_id: maintenanceKeys.find(key => key.name === "name")!.id
            },{
                key: "car_maintenance.start_date",
                metatype_key_id: maintenanceKeys.find(key => key.name === "start date")!.id
            },{
                key: "car_maintenance.average_visits_per_year",
                metatype_key_id: maintenanceKeys.find(key => key.name === "average visits per year")!.id
            }],
            metatype_id: resultMetatypes.find(m => m.name === "Maintenance")!.id,
            unique_identifier_key: "car_maintenance.id",
        } as TypeTransformationT

        let result = await TypeTransformationStorage.Instance.Create(typeMappingID, "test suite", maintenanceTransformation)
        expect(result.isError).false

        const maintenanceEntryTransformation = {
            keys: [{
                key: "car_maintenance.maintenance_entries.[].id",
                metatype_key_id: maintenanceEntryKeys.find(key => key.name === "id")!.id
            },{
                key: "car_maintenance.maintenance_entries.[].type",
                metatype_key_id: maintenanceEntryKeys.find(key => key.name === "type")!.id
            },{
                key: "car_maintenance.maintenance_entries.[].check_engine_light_flag",
                metatype_key_id: maintenanceEntryKeys.find(key => key.name === "check engine light flag")!.id
            }],
            metatype_id: resultMetatypes.find(m => m.name === "Maintenance Entry")!.id,
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

const test_metatypes: MetatypeT[] = [
    {
        name: "Car",
        description: "A vehicle"
    },{
        name: "Manufacturer",
        description: "Creator of car"
    },{
        name: "Tire Pressure",
        description: "Pressure of tire"
    },{
        name: "Maintenance",
        description: "Maintenance"
    },{
        name: "Maintenance Entry",
        description: "Maintenance Log"
    },{
        name: "Part",
        description:"physical part of a car"
    },{
        name: "Component",
        description: "base component of part"
    }
];

const test_metatype_relationships: MetatypeRelationshipT[] = [
    {
        name: "parent",
        description: "item is another's parent"
    }
];

const car_metatype_keys: MetatypeKeyT[] = [{
    name: "id",
    property_name: "id",
    description: "id of car",
    data_type: "string",
    required: true
},{
    name: "name",
    property_name: "name",
    description: "name of car",
    data_type: "string",
    required: true}]


const component_metatype_keys: MetatypeKeyT[] = [{
    name: "id",
    property_name: "id",
    description: "id of car",
    data_type: "number",
    required: true
},{
    name: "name",
    property_name: "name",
    description: "name of car",
    data_type: "string",
    required: true}]

const manufacturer_metatype_keys: MetatypeKeyT[] = [{
    name: "id",
    property_name: "id",
    description: "id of car",
    data_type: "string",
    required: true
},{
    name: "name",
    property_name: "name",
    description: "name of car",
    data_type: "string",
    required: true
},{
    name: "location",
    property_name: "location",
    description: "location of manufacturer",
    data_type: "string",
    required: true}]


const tire_pressure_metatype_keys: MetatypeKeyT[] = [{
    name: "id",
    property_name: "id",
    description: "id of car",
    data_type: "string",
    required: true
},{
    name: "measurement",
    property_name: "measurement",
    description: "measurement",
    data_type: "number",
    required: true
},{
    name: "measurement unit",
    property_name: "measurement_unit",
    description: "unit of measurement",
    data_type: "string",
    required: true
},{
    name: "measurement name",
    property_name: "measurement_name",
    description: "name of measurement",
    data_type: "string",
    required: true}]


const car_maintenance_metatype_keys: MetatypeKeyT[] = [{
    name: "id",
    property_name: "id",
    description: "id of car",
    data_type: "string",
    required: true
},{
    name: "name",
    property_name: "name",
    description: "name",
    data_type: "string",
    required: true
},{
    name: "start date",
    property_name: "start_date",
    description: "start date",
    data_type: "date",
    required: true
},{
    name: "average visits per year",
    property_name: "average_visits",
    description: "average visits per yera",
    data_type: "number",
    required: true
}]

const maintenance_entry_metatype_keys: MetatypeKeyT[] = [{
    name: "id",
    property_name: "id",
    description: "id",
    data_type: "number",
    required: true
},{
    name: "check engine light flag",
    property_name: "check_engine_light_flag",
    description: "check engine light flag",
    data_type: "boolean",
    required: true
},{
    name: "type",
    property_name: "type",
    description: "type",
    data_type: "string",
    required: true
}]

const car_part_metatype_keys: MetatypeKeyT[] = [{
    name: "id",
    property_name: "id",
    description: "id of car",
    data_type: "string",
    required: true
},{
    name: "name",
    property_name: "name",
    description: "name",
    data_type: "string",
    required: true
},{
    name: "price",
    property_name: "price",
    description: "price",
    data_type: "number",
    required: true
},{
    name: "quantity",
    property_name: "quantity",
    description: "quantity",
    data_type: "number",
    required: true
}]

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
