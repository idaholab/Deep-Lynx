/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerStorage from "../../data_storage/container_storage";
import DataSourceStorage from "../../data_storage/import/data_source_storage";
import TypeMappingStorage from "../../data_storage/import/type_mapping_storage";
import {TypeMappingT} from "../../types/import/typeMappingT";
import MetatypeStorage from "../../data_storage/metatype_storage";
import MetatypeKeyStorage from "../../data_storage/metatype_key_storage";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import GraphStorage from "../../data_storage/graph/graph_storage";
import MetatypeRelationshipStorage from "../../data_storage/metatype_relationship_storage";
import MetatypeRelationshipPairStorage from "../../data_storage/metatype_relationship_pair_storage";
import ImportStorage from "../../data_storage/import/import_storage";
import DataStagingStorage from "../../data_storage/import/data_staging_storage";
import {DataSourceProcessor} from "../../data_processing/processing";

describe('Data Processing Can', async() => {
    var containerID: string = process.env.TEST_CONTAINER_ID || "";
    var graphID: string = ""
    var metatypeID: string = ""
    var metatypeKeys: MetatypeKeyT[] = []

    var metatype2ID: string = ""
    var metatypeRelationshipID: string = ""
    var metatypeRelationshipPairID: string = ""

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping export tests, no storage layer");
            this.skip()
        }

        let storage = ContainerStorage.Instance;

        await PostgresAdapter.Instance.init();
        let container = await storage.Create("test suite", {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value[0].id!;

        let metatypeStorage = MetatypeStorage.Instance;
        let metatypeRelationshipStorage = MetatypeRelationshipStorage.Instance;
        let metatypeRelationshipPairStorage = MetatypeRelationshipPairStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        metatypeID = metatype.value[0].id!

        let metatype2 = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype2.isError).false;
        expect(metatype2.value).not.empty;

        metatype2ID = metatype2.value[0].id!

        let relationship = await metatypeRelationshipStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(relationship.isError).false

        metatypeRelationshipID = relationship.value[0].id!

        let pair = await metatypeRelationshipPairStorage.Create(containerID, "test suite", {
            "name": faker.name.findName(),
                "description": faker.random.alphaNumeric(),
                "origin_metatype_id": metatypeID,
                "destination_metatype_id": metatype2ID,
                "relationship_id": metatypeRelationshipID,
                "relationship_type": "one:one"
        })

        expect(pair.isError).false
        metatypeRelationshipPairID = pair.value[0].id!

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;


        let keys2 = await keyStorage.Create(metatype2ID, "test suite", test_keys);
        expect(keys2.isError).false;

        metatypeKeys = keys.value

        let graph = await GraphStorage.Instance.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        graphID = graph.value.id

        return Promise.resolve()
    });

    it('take a completed and mapped import and insert into storage', async()=> {
        let dataSourceStorage = DataSourceStorage.Instance
        let exp = await dataSourceStorage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let dataSourceID = exp.value.id!

        let mappingStorage = TypeMappingStorage.Instance
        let importStorage = ImportStorage.Instance

        // First create the import and load the test data as an import, we create
        // a manual data storage object in this instance, though it doesn't really matter
        let imports = await importStorage.InitiateImport(dataSourceID, "test suite", "test")
        expect(imports.isError).false

        await DataStagingStorage.Instance.Create(dataSourceID, imports.value, test_raw_payload)
        // Next, create the mapping and attempt to use mapping to query matching data
        // that should exist in data_staging. Has the added bonus of testing that
        // trigger for taking json data from imports and parsing to data_staging
        let mapping = await mappingStorage.Create(containerID, dataSourceID,"test suite", {
            type_key: "TYPE",
            type_value: "EQUIP",
            unique_identifier_key: "ITEM_ID",
            metatype_id: metatypeID,
            keys: [
                {
                    key: "RAD",
                    // @ts-ignore
                    metatype_key_id: metatypeKeys.find(k => k.name === "Radius").id!
                },
                {
                    key: "COLOR",
                    // @ts-ignore
                    metatype_key_id: metatypeKeys.find(k => k.name === "Color").id!
                }
            ],
            example_payload: test_raw_payload,
            ignored_keys: ["ITEM_ID", "TYPE"]
        } as TypeMappingT)

        expect(mapping.isError).false

        let matches = await DataStagingStorage.Instance.ListForTypeMapping(mapping.value)
        expect(matches.isError).false
        expect(matches.value).not.empty

        // now with the mappings verified, run the data processor and see what happens.
        let processor = new DataSourceProcessor(exp.value, graphID)

        let currentImport = await ImportStorage.Instance.RetrieveLast(exp.value.id!)
        expect(currentImport.isError).false

        // verify that the data staging for said import is valid
        let unmappedData = await DataStagingStorage.Instance.CountUnmappedData(currentImport.value.id!)
        expect(unmappedData.isError).false
        expect(unmappedData.value).eq(0)

        let processed = await processor.process(currentImport.value.id!)
        expect(processed.isError).false
        expect(processed.value).true

        let testCurrentImport = await ImportStorage.Instance.RetrieveLast(exp.value.id!)
        expect(testCurrentImport.isError).false

        return mappingStorage.PermanentlyDelete(mapping.value.id!)
    });
});

const test_keys: MetatypeKeyT[] = [
    {
    name: "Radius",
    property_name: "radius",
    required: true,
    description: "radius for a pipe",
    data_type: "number"
    },
    {
        name: "Color",
        property_name: "color",
        required: true,
        description: "color of pipe allowed",
        data_type: "enumeration",
        options: ["yellow", "blue"]
    },
    {
        name: "Not Required",
        property_name: "optional",
        required: false,
        description: "not required",
        data_type: "number",
    },
];

const test_processed_payload = {
    "radius": 0.1,
    "color": "blue",
}

const test_raw_payload = {
    "RAD": 0.1,
    "COLOR": "blue",
    "TYPE": "EQUIP",
    "TEST": "TEST",
    "ITEM_ID": "123"
}

const test_raw_payload2 = {
    "RAD": 0.1,
    "COLOR": "blue",
    "TYPE": "PIPE",
    "TEST": "TEST",
    "ITEM_ID": "1234"
}

const test_raw_payload3 = {
    "RAD": 0.1,
    "COLOR": "blue",
    "TYPE": "PIPE",
    "TEST": "TEST",
    "ITEM_ID": "1234",
    "ORIGIN": "123",
    "DESTINATION": "1234"
}

const test_raw_payload_relationship = {
    "RAD": 0.1,
    "COLOR": "blue",
    "TYPE": "CONNECTION",
    "TEST": "TEST",
    "ITEM_ID": "12346",
    "ORIGIN": "123",
    "DESTINATION": "1234"
}
