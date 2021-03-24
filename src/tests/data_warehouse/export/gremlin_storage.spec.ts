/* tslint:disable */
import Logger from "../../../services/logger";
import PostgresAdapter from "../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import MetatypeKeyMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import MetatypeMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import faker from "faker";
import {expect} from "chai";
import GraphMapper from "../../../data_access_layer/mappers/data_warehouse/data/graph_mapper";
import NodeMapper from "../../../data_access_layer/mappers/data_warehouse/data/node_mapper";
import ContainerStorage from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import EdgeMapper from "../../../data_access_layer/mappers/data_warehouse/data/edge_mapper";
import MetatypeRelationshipMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper";
import MetatypeRelationshipPairMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper";
import ExportMapper from "../../../data_access_layer/mappers/data_warehouse/export/export_mapper";
import GremlinExportMapper from "../../../data_access_layer/mappers/data_warehouse/export/gremlin_export_mapper";
import Container from "../../../data_warehouse/ontology/container";
import Metatype from "../../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import MetatypeRelationship from "../../../data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipPair from "../../../data_warehouse/ontology/metatype_relationship_pair";
import MetatypeKey from "../../../data_warehouse/ontology/metatype_key";
import Node from "../../../data_warehouse/data/node";
import Edge from "../../../data_warehouse/data/edge";
import ExportRecord, {StandardConfig} from "../../../data_warehouse/export/export";

describe('Gremlin Exporter', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping nodes graph tests, no storage layer");
            this.skip()
        }

        if (process.env.SKIP_GREMLIN_TESTS === 'true') {
            Logger.debug("skipping gremlin tests");
            this.skip()
        }
        await PostgresAdapter.Instance.init();
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        return Promise.resolve()
    });

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('can initiate export by copying nodes and edges', async(done)=> {
        const storage = EdgeMapper.Instance;
        const nStorage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphMapper.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rpStorage = MetatypeRelationshipPairMapper.Instance;

        // SETUP CREATE NODES AND EDGE
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mMapper.BulkCreate( "test suite",
            [
                new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
                new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
            ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys1 = [...test_keys]
        testKeys1.forEach(key => key.metatype_id = metatype.value[0].id)
        const keys = await kStorage.BulkCreate("test suite", testKeys1);
        expect(keys.isError).false;

        const testKeys2 = [...test_keys]
        testKeys2.forEach(key => key.metatype_id = metatype.value[1].id)
        const keys2 = await kStorage.BulkCreate("test suite", testKeys2);
        expect(keys2.isError).false;

        const mixed = [new Node({
            container_id: containerID,
            graph_id: graph.value.id!,
            metatype: metatype.value[0].id!,
            properties: payload
        }), new Node({
            container_id: containerID,
            graph_id: graph.value.id!,
            metatype: metatype.value[1].id!,
            properties: payload
        })];

        const node = await nStorage.BulkCreateOrUpdateByCompositeID("test suite",  mixed);
        expect(node.isError, metatype.error?.error).false;

        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create("test suite", new MetatypeRelationshipPair({
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype": metatype.value[0].id!,
            "destination_metatype": metatype.value[1].id!,
            "relationship": relationship.value.id!,
            "relationship_type": "one:one",
            container_id: containerID
        }));

        // EDGE SETUP
        let edge = await storage.CreateOrUpdateByCompositeID("test suite",  new Edge({
            container_id: containerID,
            graph_id: graph.value.id!,
            metatype_relationship_pair: pair.value.id!,
            properties: payload,
            origin_node_id: node.value[0].id,
            destination_node_id: node.value[1].id
        }));

        expect(edge.isError).false;

        // INITIATE AND CHECK UNASSOCIATED
        let exportStorage = ExportMapper.Instance;

        let exp = await exportStorage.Create("test suite",
            new ExportRecord({container_id: containerID, adapter:"gremlin", config: new StandardConfig()}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let gremlinExportStorage = GremlinExportMapper.Instance;

        let initiated = await gremlinExportStorage.InitiateExport(exp.value.id!, containerID);
        expect(initiated.isError).false;

        const transaction = await GremlinExportMapper.Instance.startTransaction()

        gremlinExportStorage.ListUnassociatedNodesAndLock(exp.value.id!, 0, 100, transaction.value)
            .then((res: any) => {
                console.log(res)
            })
            .catch((e:any) => {
                console.log(e)
            });

        let unassociatedNodes = await gremlinExportStorage.ListUnassociatedNodesAndLock(exp.value.id!, 0, 100, transaction.value);
        expect(unassociatedNodes.isError).false;
        expect(unassociatedNodes.value).not.empty;

        let unassociatedEdges = await gremlinExportStorage.ListUnassociatedEdgesAndLock(exp.value.id!, 0, 100, transaction.value);
        expect(unassociatedEdges.isError).false;
        expect(unassociatedEdges.value).not.empty;

        let associatedEdges = await gremlinExportStorage.ListAssociatedEdges(exp.value.id!, 0, 100);
        expect(associatedEdges.isError).false;
        expect(associatedEdges.value).empty;

        let associatedNodes = await gremlinExportStorage.ListAssociatedNodes(exp.value.id!, 0, 100);
        expect(associatedNodes.isError).false;
        expect(associatedNodes).empty;

        done()
    });

});

const payload: {[key:string]:any} = {
    "flower": "Daisy",
    "color": "yellow",
    "notRequired": 1
};

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({name: "Test", description: "flower name", required: true, property_name: "flower_name", data_type: "string"}),
    new MetatypeKey({name: "Test2", description: "color of flower allowed", required: true, property_name: "color", data_type: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeKey({name: "Test Not Required", description: "not required", required: false, property_name: "notRequired", data_type: "number"}),
];

export const single_test_key: MetatypeKey = new MetatypeKey({name: "Test Not Required", description: "not required", required: false, property_name: "notRequired", data_type: "number"})
