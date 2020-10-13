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
import {TransformPayload} from "../../data_processing/type_mapping";
import NodeStorage from "../../data_storage/graph/node_storage";
import GraphStorage from "../../data_storage/graph/graph_storage";
import MetatypeRelationshipStorage from "../../data_storage/metatype_relationship_storage";
import MetatypeRelationshipPairStorage from "../../data_storage/metatype_relationship_pair_storage";
import EdgeStorage from "../../data_storage/graph/edge_storage";
import ImportStorage from "../../data_storage/import/import_storage";
import DataStagingStorage from "../../data_storage/import/data_staging_storage";
import {EdgeT} from "../../types/graph/edgeT";
import {NodeT} from "../../types/graph/nodeT";

describe('A Data Type Mapping', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

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

        return Promise.resolve()
    });

    it('can be saved to storage', async()=> {
        let storage = DataSourceStorage.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let mapping = await mappingStorage.Create(containerID, exp.value.id!, "test suite", {
           type_key: "type",
           type_value: "EQUIPMENT",
           unique_identifier_key: "id",
           metatype_id: metatype.value[0].id,
           keys: [{
               key: "RADIUS",
               metatype_key_id: keys.value[0].id
           }],
            example_payload: {
               "RADIUS": 0.1
            }
        } as TypeMappingT)

        expect(mapping.isError).false

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be retrieved from storage', async()=> {
        let storage = DataSourceStorage.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let mapping = await mappingStorage.Create(containerID, exp.value.id!, "test suite", {
            type_key: "type",
            type_value: "EQUIPMENT",
            unique_identifier_key: "id",
            metatype_id: metatype.value[0].id,
            keys: [{
                key: "RADIUS",
                metatype_key_id: keys.value[0].id
            }]
        } as TypeMappingT)

        expect(mapping.isError).false

        let fetched = await mappingStorage.Retrieve(mapping.value.id!)
        expect(fetched.isError).false
        expect(fetched.value.keys).not.empty

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be listed from storage by container and data source', async()=> {
        let storage = DataSourceStorage.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let mapping = await mappingStorage.Create(containerID,exp.value.id!, "test suite", {
            type_key: "type",
            type_value: "EQUIPMENT",
            unique_identifier_key: "id",
            metatype_id: metatype.value[0].id,
            keys: [{
                key: "RADIUS",
                metatype_key_id: keys.value[0].id
            }]
        } as TypeMappingT)

        expect(mapping.isError).false

        let fetched = await mappingStorage.List(containerID, 0, 100)
        expect(fetched.isError).false
        expect(fetched.value).not.empty

        let fetched2 = await mappingStorage.ListByDataSource(exp.value.id!, 0, 100)
        expect(fetched2.isError).false
        expect(fetched2.value).not.empty

        return storage.PermanentlyDelete(exp.value.id!)
    });

    it('can be deleted from storage', async()=> {
        let storage = DataSourceStorage.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let keyStorage = MetatypeKeyStorage.Instance
        let mappingStorage = TypeMappingStorage.Instance

        let metatype = await metatypeStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let keys = await keyStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        let exp = await storage.Create(containerID, "test suite",
            {
                name: "Test Data Source",
                active:false,
                adapter_type:"http",
                data_format: "json",
                config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let mapping = await mappingStorage.Create(containerID, exp.value.id!, "test suite", {
            type_key: "type",
            type_value: "EQUIPMENT",
            unique_identifier_key: "id",
            metatype_id: metatype.value[0].id,
            keys: [{
                key: "RADIUS",
                metatype_key_id: keys.value[0].id
            }]
        } as TypeMappingT)

        expect(mapping.isError).false

        let deleted = await mappingStorage.PermanentlyDelete(mapping.value.id!)
        expect(deleted.value).true

        let fetched = await mappingStorage.Retrieve(mapping.value.id!)
        expect(fetched.isError).true

        return storage.PermanentlyDelete(exp.value.id!)
    });
});

describe('We can use a Data Type Mapping To', async() => {
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

    it('transform one payload to an accepted payload and insert as node', async()=> {
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

        let mapped = await TransformPayload(mapping.value, test_raw_payload)

        let node = await NodeStorage.Instance.CreateOrUpdate(containerID,graphID, mapped.value)
        expect(node.isError).false

        return mappingStorage.PermanentlyDelete(mapping.value.id!)
    });

    it('transform one payload to an accepted payload and insert as edge', async()=> {
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

        let mapping2 = await mappingStorage.Create(containerID, dataSourceID,"test suite", {
            type_key: "TYPE",
            type_value: "PIPE",
            unique_identifier_key: "ITEM_ID",
            metatype_id: metatype2ID,
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
            example_payload: test_raw_payload2,
            ignored_keys: ["ITEM_ID", "TYPE"]
        } as TypeMappingT)

        expect(mapping2.isError).false


        // First node
        let mapped = await TransformPayload(mapping.value, test_raw_payload)

        let node = await NodeStorage.Instance.CreateOrUpdate(containerID,graphID, mapped.value)
        expect(node.isError).false

        // Second node
        let mapped2 = await TransformPayload(mapping2.value, test_raw_payload2)

        let node2 = await NodeStorage.Instance.CreateOrUpdate(containerID,graphID,mapped2.value)
        expect(node2.isError).false

        // Edge Mapping
        let edgemapping = await mappingStorage.Create(containerID, dataSourceID, "test suite", {
            type_key: "TYPE",
            type_value: "CONNECTION",
            unique_identifier_key: "ITEM_ID",
            metatype_relationship_pair_id: metatypeRelationshipPairID,
            origin_key: "ORIGIN",
            destination_key: "DESTINATION",
            example_payload: test_raw_payload_relationship,
            ignored_keys: ["ITEM_ID", "TYPE"]
        } as TypeMappingT)

        expect(edgemapping.isError).false

        let mappedEdge = await TransformPayload(edgemapping.value, test_raw_payload_relationship)
        expect(mappedEdge.isError).false

        let edge = await EdgeStorage.Instance.CreateOrUpdate(containerID, graphID, mappedEdge.value)

        expect(edge.isError).false


        return mappingStorage.PermanentlyDelete(mapping.value.id!)
    });

    it('transform one payload to an accepted payload and insert as both node and edge', async()=> {
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

        // First node
        let mapped = await TransformPayload(mapping.value, test_raw_payload)

        let node = await NodeStorage.Instance.CreateOrUpdate(containerID,graphID, mapped.value)
        expect(node.isError).false

        // create a Node/Edge mapping
        let nodeEdgeMapping = await mappingStorage.Create(containerID, dataSourceID,"test suite", {
            type_key: "TYPE",
            type_value: "PIPE",
            relationship_type_key: "TYPE",
            relationship_type_value: "CONNECTION",
            metatype_relationship_pair_id: metatypeRelationshipPairID,
            origin_key: "ORIGIN",
            destination_key: "DESTINATION",
            unique_identifier_key: "ITEM_ID",
            metatype_id: metatype2ID,
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
            example_payload: test_raw_payload2,
            ignored_keys: ["ITEM_ID", "TYPE"]
        } as TypeMappingT)

        expect(nodeEdgeMapping.isError).false
        // verify that we have received a tuple back (Tuples are just Arrays in Typescript)

        // Second node
        let nodeEdgeMapped = await TransformPayload(nodeEdgeMapping.value, test_raw_payload3)

        expect((nodeEdgeMapped.value instanceof Array)).true

        let node2 = await NodeStorage.Instance.CreateOrUpdate(containerID,graphID, (nodeEdgeMapped.value as [NodeT, EdgeT])[0])
        expect(node2.isError).false


        let edge = await EdgeStorage.Instance.CreateOrUpdate(containerID, graphID,  (nodeEdgeMapped.value as [NodeT, EdgeT])[1])
        expect(edge.isError).false


        return mappingStorage.PermanentlyDelete(mapping.value.id!)

    });

    it('transform one payload to an accepted payload and insert as both node and edge, updates if one already exists', async()=> {
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

        // First node
        let mapped = await TransformPayload(mapping.value, test_raw_payload)

        let node = await NodeStorage.Instance.CreateOrUpdate(containerID,graphID, mapped.value)
        expect(node.isError).false

        // create a Node/Edge mapping
        let nodeEdgeMapping = await mappingStorage.Create(containerID, dataSourceID,"test suite", {
            type_key: "TYPE",
            type_value: "PIPE",
            relationship_type_key: "TYPE",
            relationship_type_value: "CONNECTION",
            metatype_relationship_pair_id: metatypeRelationshipPairID,
            origin_key: "ORIGIN",
            destination_key: "DESTINATION",
            unique_identifier_key: "ITEM_ID",
            metatype_id: metatype2ID,
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
            example_payload: test_raw_payload2,
            ignored_keys: ["ITEM_ID", "TYPE"]
        } as TypeMappingT)

        expect(nodeEdgeMapping.isError).false
        // verify that we have received a tuple back (Tuples are just Arrays in Typescript)

        // Second node
        let nodeEdgeMapped = await TransformPayload(nodeEdgeMapping.value, test_raw_payload3)

        expect((nodeEdgeMapped.value instanceof Array)).true

        let node2 = await NodeStorage.Instance.CreateOrUpdate(containerID,graphID, (nodeEdgeMapped.value as [NodeT, EdgeT])[0])
        expect(node2.isError).false


        let edge = await EdgeStorage.Instance.CreateOrUpdate(containerID, graphID,  (nodeEdgeMapped.value as [NodeT, EdgeT])[1])
        expect(edge.isError).false

        let node3 = await NodeStorage.Instance.CreateOrUpdate(containerID,graphID, (nodeEdgeMapped.value as [NodeT, EdgeT])[0])
        expect(node3.isError).false

        return mappingStorage.PermanentlyDelete(mapping.value.id!)

    });

    it('find all data that matches the mapping', async()=> {
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


        return mappingStorage.PermanentlyDelete(mapping.value.id!)
    });

    it('find no data if no matching mappings are found', async()=> {
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
        let imports = await importStorage.InitiateImport(dataSourceID, "test suite",  "test")
        expect(imports.isError).false

        await DataStagingStorage.Instance.Create(dataSourceID, imports.value, test_raw_payload2)
        // Next, create the mapping and attempt to use mapping to query matching data
        // that should exist in data_staging. Has the added bonus of testing that
        // trigger for taking json data from imports and parsing to data_staging
        let mapping = await mappingStorage.Create(containerID, dataSourceID,"test suite", {
            type_key: "TYPE",
            type_value: faker.name.firstName(),
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
            example_payload: test_raw_payload2,
            ignored_keys: ["ITEM_ID", "TYPE"]
        } as TypeMappingT)

        expect(mapping.isError).false

        let matches = await DataStagingStorage.Instance.ListForTypeMapping(mapping.value)

        expect(matches.isError).false
        expect(matches.value).empty

        return mappingStorage.PermanentlyDelete(mapping.value.id!)
    });

    it('PLACEHOLDER for database type mappings trigger function', async()=> {
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


        return mappingStorage.PermanentlyDelete(mapping.value.id!)
    });


    it('transform a payload with nested keys', async()=> {
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

        let mapping = await mappingStorage.Create(containerID, dataSourceID,"test suite", {
            type_key: "META.TYPE",
            type_value: "EQUIP",
            unique_identifier_key: "ITEM_ID",
            metatype_id: metatypeID,
            keys: [
                {
                    key: "ATTRIBUTES.RAD",
                    // @ts-ignore
                    metatype_key_id: metatypeKeys.find(k => k.name === "Radius").id!
                },
                {
                    key: "ATTRIBUTES.COLOR",
                    // @ts-ignore
                    metatype_key_id: metatypeKeys.find(k => k.name === "Color").id!
                }
            ],
            example_payload: test_raw_payload,
            ignored_keys: ["ITEM_ID", "META.TYPE"]
        } as TypeMappingT)

        expect(mapping.isError).false

        let mapped = await TransformPayload(mapping.value, test_raw_payload_nested)

        let node = await NodeStorage.Instance.CreateOrUpdate(containerID,graphID, mapped.value)
        expect(node.isError).false

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

const test_raw_payload_nested = {
    "ATTRIBUTES": {
        "RAD": 0.1,
        "COLOR": "blue",
    },
    "META": {
        "TYPE": "EQUIP",
        "TEST": "TEST",
    },
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
