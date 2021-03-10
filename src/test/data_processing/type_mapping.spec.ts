/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import DataSourceStorage from "../../data_access_layer/mappers/import/data_source_storage";
import TypeMappingStorage from "../../data_access_layer/mappers/import/type_mapping_storage";
import {TypeMappingT, TypeTransformationConditionT, TypeTransformationT} from "../../types/import/typeMappingT";
import MetatypeMapper from "../../data_access_layer/mappers/metatype_mapper";
import MetatypeKeyMapper from "../../data_access_layer/mappers/metatype_key_mapper";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import {ApplyTransformation, ValidTransformationCondition} from "../../data_processing/type_mapping";
import {objectToShapeHash} from "../../utilities";
import {NodeT} from "../../types/graph/nodeT";
import NodeStorage from "../../data_access_layer/mappers/graph/node_storage";
import GraphStorage from "../../data_access_layer/mappers/graph/graph_storage";
import {DataStagingT} from "../../types/import/dataStagingT";
import ImportStorage from "../../data_access_layer/mappers/import/import_storage";
import DataStagingStorage from "../../data_access_layer/mappers/import/data_staging_storage";
import {MetatypeRelationshipT} from "../../types/metatype_relationshipT";
import MetatypeRelationshipMapper from "../../data_access_layer/mappers/metatype_relationship_mapper";
import MetatypeRelationshipPairStorage from "../../data_access_layer/mappers/metatype_relationship_pair_storage";
import {MetatypeRelationshipPairT} from "../../types/metatype_relationship_pairT";
import EdgeStorage from "../../data_access_layer/mappers/graph/edge_storage";
import {EdgeT} from "../../types/graph/edgeT";
import Container from "../../data_warehouse/ontology/container";
import Metatype from "../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";
import MetatypeRelationship from "../../data_warehouse/ontology/metatype_relationship";

describe('A Data Type Mapping can', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";
    var graphID: string = ""
    var typeMappingID: string = ""
    var typeMapping: TypeMappingT | undefined = undefined
    var dataSourceID: string = ""
    var resultMetatypes: Metatype[] = []
    var resultMetatypeRelationships: MetatypeRelationshipT[] = []
    var data: DataStagingT | undefined = undefined

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
        let metatypeStorage = MetatypeMapper.Instance;
        let relationshipMapper = MetatypeRelationshipMapper.Instance;
        let keyStorage = MetatypeKeyMapper.Instance
        let mappingStorage = TypeMappingStorage.Instance

        const test_metatypes: Metatype[] = [
            new Metatype(containerID,"Car", "A Vehicle"),
            new Metatype(containerID,"Manufacturer", "Creator of Car"),
            new Metatype(containerID,"Tire Pressure", "Pressure of tire"),
            new Metatype(containerID,"Maintenance", "Maintenance records"),
            new Metatype(containerID,"Maintenance Entry", "Maintenance entries"),
            new Metatype(containerID,"Part", "Physical part of car"),
            new Metatype(containerID,"Component", "Base component of part"),
        ];

        let metatypes = await metatypeStorage.BulkCreate("test suite", test_metatypes);

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

        const test_metatype_relationships: MetatypeRelationship[] = [
            new MetatypeRelationship(containerID, "parent", "item is another's parent")
        ];

        // create the relationships
        let metatypeRelationships = await relationshipMapper.BulkCreate("test suite", test_metatype_relationships)
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
                active:false,
                adapter_type:"manual",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        dataSourceID = exp.value.id!

        const shapeHash = objectToShapeHash(test_payload[0])

        let mapping = await mappingStorage.Create(containerID, exp.value.id!,shapeHash, test_payload[0])

        expect(mapping.isError).false

        typeMappingID = mapping.value.id
        typeMapping = mapping.value

        // now import the data
        const newImport = await ImportStorage.Instance.InitiateImport(dataSourceID, "test suite", "testing suite upload")
        expect(newImport.isError).false

        const inserted = await DataStagingStorage.Instance.Create(dataSourceID, newImport.value, typeMappingID, test_payload[0])
        expect(inserted.isError).false
        expect(inserted.value).true

        const insertedData = await DataStagingStorage.Instance.List(newImport.value, 0, 1)
        expect(insertedData.isError).false
        expect(insertedData.value).not.empty

        data = insertedData.value[0]

        return Promise.resolve()
    })

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('can generate a car node', async() => {
        const carTransformation = {
           keys: [{
               key: "car.id",
               metatype_key_id: carKeys.find(key => key.name === "id")!.id
           }, {
               key: "car.name",
               metatype_key_id: carKeys.find(key => key.name === "name")!.id
           }],
            metatype_id: resultMetatypes.find(m => m.name === "Car")!.id,
            unique_identifier_key: "car.id"
        } as TypeTransformationT

        const results = await ApplyTransformation(typeMapping!, carTransformation, data!)

        expect((results.value as NodeT[])[0].properties).to.have.property('name', 'test car')
        expect((results.value as NodeT[])[0].properties).to.have.property('id', 'UUID')
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[0].original_data_id).eq("UUID")
        expect((results.value as NodeT[])[0].composite_original_id).eq(`${containerID}+${dataSourceID}+car.id+UUID`)

        const inserted = await NodeStorage.Instance.CreateOrUpdate(containerID, graphID, results.value)
        expect(inserted.isError).false

        return NodeStorage.Instance.PermanentlyDelete(inserted.value[0].id!)
    })

    it('can generate a car node with constant values', async() => {
        const carTransformation = {
            keys: [{
                value: "TEST UUID",
                metatype_key_id: carKeys.find(key => key.name === "id")!.id
            }, {
                value: "MOTOROLA",
                metatype_key_id: carKeys.find(key => key.name === "name")!.id
            }],
            metatype_id: resultMetatypes.find(m => m.name === "Car")!.id,
            unique_identifier_key: "car.id"
        } as TypeTransformationT

        const results = await ApplyTransformation(typeMapping!, carTransformation, data!)

        expect(Array.isArray(results.value)).true
        expect(results.value).not.empty

        expect((results.value as NodeT[])[0].properties).to.have.property('name', 'MOTOROLA')
        expect((results.value as NodeT[])[0].properties).to.have.property('id', 'TEST UUID')
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[0].original_data_id).eq("UUID")
        expect((results.value as NodeT[])[0].composite_original_id).eq(`${containerID}+${dataSourceID}+car.id+UUID`)

        const inserted = await NodeStorage.Instance.CreateOrUpdate(containerID, graphID, results.value)
        expect(inserted.isError).false

        return NodeStorage.Instance.PermanentlyDelete(inserted.value[0].id!)
    })

    // this will handle testing the root array function
    it('can generate car maintenance entries', async() => {
        const maintenanceTransformation = {
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

        const results = await ApplyTransformation(typeMapping!, maintenanceTransformation, data!)

        expect(Array.isArray(results.value)).true
        expect(results.value.length).eq(2) // a total of two nodes should be created

        expect((results.value as NodeT[])[0].properties).to.have.property('id', 1)
        expect((results.value as NodeT[])[0].properties).to.have.property('type', 'oil change')
        expect((results.value as NodeT[])[0].properties).to.have.property('check_engine_light_flag', true)
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[0].original_data_id).eq("1") // original IDs are strings
        expect((results.value as NodeT[])[0].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].id+1`)

        expect((results.value as NodeT[])[1].properties).to.have.property('id', 2)
        expect((results.value as NodeT[])[1].properties).to.have.property('type', 'tire rotation')
        expect((results.value as NodeT[])[1].properties).to.have.property('check_engine_light_flag', false)
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[1].original_data_id).eq("2") // original IDs are strings
        expect((results.value as NodeT[])[1].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].id+2`)


        const inserted = await NodeStorage.Instance.CreateOrUpdate(containerID, graphID, results.value)
        expect(inserted.isError).false

        await NodeStorage.Instance.PermanentlyDelete(inserted.value[0].id!)
        return NodeStorage.Instance.PermanentlyDelete(inserted.value[1].id!)
    })

    it('can generate parts lists entries', async() => {
        const maintenanceTransformation = {
            keys: [{
                key: "car_maintenance.maintenance_entries.[].parts_list.[].id",
                metatype_key_id: car_part_metatype_keys.find(key => key.name === "id")!.id
            },{
                key: "car_maintenance.maintenance_entries.[].parts_list.[].name",
                metatype_key_id: car_part_metatype_keys.find(key => key.name === "name")!.id
            },{
                key: "car_maintenance.maintenance_entries.[].parts_list.[].quantity",
                metatype_key_id: car_part_metatype_keys.find(key => key.name === "quantity")!.id
            },{
                key: "car_maintenance.maintenance_entries.[].parts_list.[].price",
                metatype_key_id: car_part_metatype_keys.find(key => key.name === "price")!.id
            }],
            metatype_id: resultMetatypes.find(m => m.name === "Part")!.id,
            unique_identifier_key: "car_maintenance.maintenance_entries.[].parts_list.[].id",
            root_array: "car_maintenance.maintenance_entries.[].parts_list"
        } as TypeTransformationT

        const results = await ApplyTransformation(typeMapping!, maintenanceTransformation, data!)

        expect(Array.isArray(results.value)).true
        expect(results.value.length).eq(5) // a total of two nodes should be created

        expect((results.value as NodeT[])[0].properties).to.have.property('id', "oil")
        expect((results.value as NodeT[])[0].properties).to.have.property('name', 'synthetic oil')
        expect((results.value as NodeT[])[0].properties).to.have.property('price', 45.66)
        expect((results.value as NodeT[])[0].properties).to.have.property('quantity', 1)
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[0].original_data_id).eq("oil")
        expect((results.value as NodeT[])[0].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].parts_list.[].id+oil`)

        expect((results.value as NodeT[])[1].properties).to.have.property('id', "pan")
        expect((results.value as NodeT[])[1].properties).to.have.property('name', 'oil pan')
        expect((results.value as NodeT[])[1].properties).to.have.property('price', 15.50)
        expect((results.value as NodeT[])[1].properties).to.have.property('quantity', 1)
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[1].original_data_id).eq("pan")
        expect((results.value as NodeT[])[1].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].parts_list.[].id+pan`)

        expect((results.value as NodeT[])[2].properties).to.have.property('id', "tire")
        expect((results.value as NodeT[])[2].properties).to.have.property('name', 'all terrain tire')
        expect((results.value as NodeT[])[2].properties).to.have.property('price', 150.99)
        expect((results.value as NodeT[])[2].properties).to.have.property('quantity', 4)
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[2].original_data_id).eq("tire")
        expect((results.value as NodeT[])[2].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].parts_list.[].id+tire`)

        expect((results.value as NodeT[])[3].properties).to.have.property('id', "wrench")
        expect((results.value as NodeT[])[3].properties).to.have.property('name', 'wrench')
        expect((results.value as NodeT[])[3].properties).to.have.property('price', 4.99)
        expect((results.value as NodeT[])[3].properties).to.have.property('quantity', 1)
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[3].original_data_id).eq("wrench")
        expect((results.value as NodeT[])[3].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].parts_list.[].id+wrench`)

        expect((results.value as NodeT[])[4].properties).to.have.property('id', "bolts")
        expect((results.value as NodeT[])[4].properties).to.have.property('name', 'bolts')
        expect((results.value as NodeT[])[4].properties).to.have.property('price', 1.99)
        expect((results.value as NodeT[])[4].properties).to.have.property('quantity', 5)
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[4].original_data_id).eq("bolts")
        expect((results.value as NodeT[])[4].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].parts_list.[].id+bolts`)


        const inserted = await NodeStorage.Instance.CreateOrUpdate(containerID, graphID, results.value)
        expect(inserted.isError).false

        await NodeStorage.Instance.PermanentlyDelete(inserted.value[0].id!)
        await NodeStorage.Instance.PermanentlyDelete(inserted.value[1].id!)
        await NodeStorage.Instance.PermanentlyDelete(inserted.value[2].id!)
        await NodeStorage.Instance.PermanentlyDelete(inserted.value[3].id!)
        return NodeStorage.Instance.PermanentlyDelete(inserted.value[4].id!)
    })

    it('can generate parts lists entries based on conditions', async() => {
        const maintenanceTransformation = {
            conditions: [
                {
                    key: "car.name",
                    operator: "==",
                    value: "test car",
                    subexpressions: [{
                        expression: "AND",
                        key: "car_maintenance.maintenance_entries.[].parts_list.[].id",
                        operator: "==",
                        value: "oil"
                    }]
                }
            ],
            keys: [{
                key: "car_maintenance.maintenance_entries.[].parts_list.[].id",
                metatype_key_id: car_part_metatype_keys.find(key => key.name === "id")!.id
            },{
                key: "car_maintenance.maintenance_entries.[].parts_list.[].name",
                metatype_key_id: car_part_metatype_keys.find(key => key.name === "name")!.id
            },{
                key: "car_maintenance.maintenance_entries.[].parts_list.[].quantity",
                metatype_key_id: car_part_metatype_keys.find(key => key.name === "quantity")!.id
            },{
                key: "car_maintenance.maintenance_entries.[].parts_list.[].price",
                metatype_key_id: car_part_metatype_keys.find(key => key.name === "price")!.id
            }],
            metatype_id: resultMetatypes.find(m => m.name === "Part")!.id,
            unique_identifier_key: "car_maintenance.maintenance_entries.[].parts_list.[].id",
            root_array: "car_maintenance.maintenance_entries.[].parts_list"
        } as TypeTransformationT

        const results = await ApplyTransformation(typeMapping!, maintenanceTransformation, data!)

        expect(Array.isArray(results.value)).true
        expect(results.value.length).eq(1) // a total of two nodes should be created

        expect((results.value as NodeT[])[0].properties).to.have.property('id', "oil")
        expect((results.value as NodeT[])[0].properties).to.have.property('name', 'synthetic oil')
        expect((results.value as NodeT[])[0].properties).to.have.property('price', 45.66)
        expect((results.value as NodeT[])[0].properties).to.have.property('quantity', 1)
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[0].original_data_id).eq("oil")
        expect((results.value as NodeT[])[0].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].parts_list.[].id+oil`)

        const inserted = await NodeStorage.Instance.CreateOrUpdate(containerID, graphID, results.value)
        expect(inserted.isError).false

        return NodeStorage.Instance.PermanentlyDelete(inserted.value[0].id!)
    })


    // generally testing that our root array can indeed go more than 2 layers deep
    it('can generate component entries', async() => {
        const componentTransformation = {
            keys: [{
                key: "car_maintenance.maintenance_entries.[].parts_list.[].components.[].id",
                metatype_key_id: componentKeys.find(key => key.name === "id")!.id
            },{
                key: "car_maintenance.maintenance_entries.[].parts_list.[].components.[].name",
                metatype_key_id: componentKeys.find(key => key.name === "name")!.id
            }],
            metatype_id: resultMetatypes.find(m => m.name === "Component")!.id,
            unique_identifier_key: "car_maintenance.maintenance_entries.[].parts_list.[].components.[].id",
            root_array: "car_maintenance.maintenance_entries.[].parts_list.[].components"
        } as TypeTransformationT

        const results = await ApplyTransformation(typeMapping!, componentTransformation, data!)

        expect(Array.isArray(results.value)).true
        expect(results.value.length).eq(1) // a total of two nodes should be created

        expect((results.value as NodeT[])[0].properties).to.have.property('id', 1)
        expect((results.value as NodeT[])[0].properties).to.have.property('name', 'oil')
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[0].original_data_id).eq("1")
        expect((results.value as NodeT[])[0].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].parts_list.[].components.[].id+1`)

        const inserted = await NodeStorage.Instance.CreateOrUpdate(containerID, graphID, results.value)
        expect(inserted.isError).false

        return NodeStorage.Instance.PermanentlyDelete(inserted.value[0].id!)
    })


    // this will handle testing the root array function
    it('can generate car maintenance entries, and connect them to a maintenance record through edges', async() => {
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

        const maintenanceResult = await ApplyTransformation(typeMapping!, maintenanceTransformation, data!)

        expect(Array.isArray(maintenanceResult.value)).true
        expect(maintenanceResult.value.length).eq(1) // a total of two nodes should be created

        expect((maintenanceResult.value as NodeT[])[0].properties).to.have.property('id', "UUID")
        expect((maintenanceResult.value as NodeT[])[0].properties).to.have.property('name', "test car's maintenance")
        expect((maintenanceResult.value as NodeT[])[0].properties).to.have.property('start_date', "1/1/2020 12:00:00")
        expect((maintenanceResult.value as NodeT[])[0].properties).to.have.property('average_visits', 4)
        // validate the original and composite ID fields worked correctly
        expect((maintenanceResult.value as NodeT[])[0].original_data_id).eq("UUID") // original IDs are strings
        expect((maintenanceResult.value as NodeT[])[0].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.id+UUID`)

        const maintenanceInserted = await NodeStorage.Instance.CreateOrUpdate(containerID, graphID, maintenanceResult.value)
        expect(maintenanceInserted.isError).false

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

        const results = await ApplyTransformation(typeMapping!, maintenanceEntryTransformation, data!)

        expect(Array.isArray(results.value)).true
        expect(results.value.length).eq(2) // a total of two nodes should be created

        expect((results.value as NodeT[])[0].properties).to.have.property('id', 1)
        expect((results.value as NodeT[])[0].properties).to.have.property('type', 'oil change')
        expect((results.value as NodeT[])[0].properties).to.have.property('check_engine_light_flag', true)
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[0].original_data_id).eq("1") // original IDs are strings
        expect((results.value as NodeT[])[0].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].id+1`)

        expect((results.value as NodeT[])[1].properties).to.have.property('id', 2)
        expect((results.value as NodeT[])[1].properties).to.have.property('type', 'tire rotation')
        expect((results.value as NodeT[])[1].properties).to.have.property('check_engine_light_flag', false)
        // validate the original and composite ID fields worked correctly
        expect((results.value as NodeT[])[1].original_data_id).eq("2") // original IDs are strings
        expect((results.value as NodeT[])[1].composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].id+2`)


        const inserted = await NodeStorage.Instance.CreateOrUpdate(containerID, graphID, results.value)
        expect(inserted.isError).false


        const maintenanceEdgeTransformation = {
            metatype_relationship_pair_id: maintenancePair!.id,
            origin_id_key: "car_maintenance.id",
            destination_id_key: "car_maintenance.maintenance_entries.[].id",
            root_array: "car_maintenance.maintenance_entries"
        } as TypeTransformationT

        const maintenanceEdgeResult = await ApplyTransformation(typeMapping!, maintenanceEdgeTransformation, data!)

        expect(Array.isArray(maintenanceEdgeResult.value)).true
        expect(maintenanceEdgeResult.value.length).eq(2) // a total of two nodes should be created

        // validate the original and composite ID fields worked correctly
        expect((maintenanceEdgeResult.value as EdgeT[])[0].origin_node_composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.id+UUID`)
        expect((maintenanceEdgeResult.value as EdgeT[])[0].destination_node_composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].id+1`)
        expect((maintenanceEdgeResult.value as EdgeT[])[1].origin_node_composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.id+UUID`)
        expect((maintenanceEdgeResult.value as EdgeT[])[1].destination_node_composite_original_id).eq(`${containerID}+${dataSourceID}+car_maintenance.maintenance_entries.[].id+2`)

        const maintenanceEdgeInserted = await EdgeStorage.Instance.CreateOrUpdate(containerID, graphID, maintenanceEdgeResult.value)
        expect(maintenanceEdgeInserted.isError).false

        await NodeStorage.Instance.PermanentlyDelete(maintenanceInserted.value[0].id!)
        await NodeStorage.Instance.PermanentlyDelete(inserted.value[0].id!)
        return NodeStorage.Instance.PermanentlyDelete(inserted.value[1].id!)
    })


    it('apply conditions and subexpressions to a payload correctly', async() => {
        const carNameFalse = {
            key: "car.name",
            operator: "==",
            value: "false"
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameFalse, test_payload[0])).false

        const carNameTrue = {
            key: "car.name",
            operator: "==",
            value: "test car"
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameTrue, test_payload[0])).true

        const carMaintenanceNested = {
            key: "car_maintenance.maintenance_entries.[].type",
            operator: "==",
            value: "oil change"
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carMaintenanceNested, test_payload[0], [0])).true

        const carNameSubexpressionFalse = {
            key: "car.name",
            operator: "==",
            value: 'test car',
            subexpressions: [{
                expression: "AND",
                key: "car.manufacturer.name",
                operator: "==",
                value: "false"
            }]
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameSubexpressionFalse, test_payload[0])).false

        const carNameSubexpressionTrue = {
            key: "car.name",
            operator: "==",
            value: 'test car',
            subexpressions: [{
                expression: "AND",
                key: "car.manufacturer.name",
                operator: "==",
                value: "Test Cars Inc"
            }]
        } as TypeTransformationConditionT


        expect(ValidTransformationCondition(carNameSubexpressionTrue, test_payload[0])).true

        const carNameSubexpressionTrueMultiple = {
            key: "car.name",
            operator: "==",
            value: 'test car',
            subexpressions: [{
                expression: "AND",
                key: "car.manufacturer.name",
                operator: "==",
                value: "Test Cars Inc"
            },{
                expression: "AND",
                key: "car.id",
                operator: "==",
                value: "UUID"
            }]
        } as TypeTransformationConditionT


        expect(ValidTransformationCondition(carNameSubexpressionTrueMultiple, test_payload[0])).true

        const carNameSubexpressionFalseMultiple = {
            key: "car.name",
            operator: "==",
            value: 'test car',
            subexpressions: [{
                expression: "AND",
                key: "car.manufacturer.name",
                operator: "==",
                value: "false"
            },{
                expression: "AND",
                key: "car.id",
                operator: "==",
                value: "UUID"
            }]
        } as TypeTransformationConditionT


        expect(ValidTransformationCondition(carNameSubexpressionFalseMultiple, test_payload[0])).false

        const carNameSubexpressionTrueOr= {
            key: "car.name",
            operator: "==",
            value: 'false',
            subexpressions: [{
                expression: "OR",
                key: "car.manufacturer.name",
                operator: "==",
                value: "Test Cars Inc"
            }]
        } as TypeTransformationConditionT


        expect(ValidTransformationCondition(carNameSubexpressionTrueOr, test_payload[0])).true

        const carNameSubexpressionTrueOrMultiple= {
            key: "car.name",
            operator: "==",
            value: 'false',
            subexpressions: [{
                expression: "OR",
                key: "car.manufacturer.name",
                operator: "==",
                value: "false"
            },{
                expression: "OR",
                key: "car.manufacturer.name",
                operator: "==",
                value: "Test Cars Inc"
            }]
        } as TypeTransformationConditionT


        expect(ValidTransformationCondition(carNameSubexpressionTrueOrMultiple, test_payload[0])).true

        const carNameNonEquality= {
            key: "car.name",
            operator: "!=",
            value: "false"
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameNonEquality, test_payload[0])).true

        const carNameIn= {
            key: "car.name",
            operator: "in",
            value: "test car, test"
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameIn, test_payload[0])).true

        const carNameInFalse= {
            key: "car.name",
            operator: "in",
            value: "false, test"
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameInFalse, test_payload[0])).false

        const carNameLike = {
            key: "car.name",
            operator: "contains",
            value: "test"
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameLike, test_payload[0])).true

        const carNameLikeFalse = {
            key: "car.name",
            operator: "contains",
            value: "false"
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameLikeFalse, test_payload[0])).false

        const carNameLesserThan = {
            key: "car_maintenance.average_visits_per_year",
            operator: "<",
            value: 10
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameLesserThan, test_payload[0])).true

        const carNameLesserThanFalse = {
            key: "car_maintenance.average_visits_per_year",
            operator: "<",
            value: 1
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameLesserThanFalse, test_payload[0])).false

        const carNameGreaterThan = {
            key: "car_maintenance.average_visits_per_year",
            operator: ">",
            value: 10
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameGreaterThan, test_payload[0])).false

        const carNameGreaterThanFalse = {
            key: "car_maintenance.average_visits_per_year",
            operator: ">",
            value: 1
        } as TypeTransformationConditionT

        expect(ValidTransformationCondition(carNameGreaterThanFalse, test_payload[0])).true
    })

});



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
