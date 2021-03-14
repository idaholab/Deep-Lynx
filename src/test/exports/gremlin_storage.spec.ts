/* tslint:disable */
import Logger from "../../logger";
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import MetatypeKeyMapper from "../../data_access_layer/mappers/metatype_key_mapper";
import MetatypeMapper from "../../data_access_layer/mappers/metatype_mapper";
import faker from "faker";
import {expect} from "chai";
import GraphStorage from "../../data_access_layer/mappers/graph/graph_storage";
import NodeStorage from "../../data_access_layer/mappers/graph/node_storage";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import EdgeStorage from "../../data_access_layer/mappers/graph/edge_storage";
import MetatypeRelationshipMapper from "../../data_access_layer/mappers/metatype_relationship_mapper";
import MetatypeRelationshipPairMapper from "../../data_access_layer/mappers/metatype_relationship_pair_mapper";
import ExportStorage from "../../data_access_layer/mappers/export/export_storage";
import GremlinExportStorage from "../../data_access_layer/mappers/export/gremlin_export_storage";
import Container from "../../data_warehouse/ontology/container";
import Metatype from "../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";
import MetatypeRelationship from "../../data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipPair from "../../data_warehouse/ontology/metatype_relationship_pair";
import MetatypeKey from "../../data_warehouse/ontology/metatype_key";

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
        const storage = EdgeStorage.Instance;
        const nStorage = NodeStorage.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const gStorage = GraphStorage.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rpStorage = MetatypeRelationshipPairMapper.Instance;

        // SETUP CREATE NODES AND EDGE
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mMapper.BulkCreate( "test suite",
            [
                new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
                new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
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

        const mixed = [{
            metatype_id: metatype.value[0].id!,
            properties: payload
        },{
            metatype_id: metatype.value[1].id!,
            properties: payload
        }];

        const node = await nStorage.CreateOrUpdate(containerID, graph.value.id,  mixed);
        expect(node.isError, metatype.error?.error).false;

        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create("test suite", new MetatypeRelationshipPair({
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "originMetatype": metatype.value[0].id!,
            "destinationMetatype": metatype.value[1].id!,
            "relationship": relationship.value.id!,
            "relationshipType": "one:one",
            containerID
        }));

        // EDGE SETUP
        let edge = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value.id,
            properties: payload,
            origin_node_id: node.value[0].id,
            destination_node_id: node.value[1].id
        });

        expect(edge.isError).false;

        // INITIATE AND CHECK UNASSOCIATED
        let exportStorage = ExportStorage.Instance;

        let exp = await exportStorage.Create(containerID, "test suite",
            {container_id: containerID, adapter:"gremlin", config: {}});

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        let gremlinExportStorage = GremlinExportStorage.Instance;

        let initiated = await gremlinExportStorage.InitiateExport(exp.value.id!, containerID);
        expect(initiated.isError).false;

        const transaction = await GremlinExportStorage.Instance.startTransaction()

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

const updatedPayload: {[key:string]:any} = {
    "flower": "Violet",
    "color": "blue",
    "notRequired": 1
};

const malformed_payload: {[key:string]:any} = {
    "flower": "Daisy",
    "notRequired": 1
};

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({name: "Test", description: "flower name", required: true, propertyName: "flower_name", dataType: "string"}),
    new MetatypeKey({name: "Test2", description: "color of flower allowed", required: true, propertyName: "color", dataType: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeKey({name: "Test Not Required", description: "not required", required: false, propertyName: "notRequired", dataType: "number"}),
];

export const single_test_key: MetatypeKey = new MetatypeKey({name: "Test Not Required", description: "not required", required: false, propertyName: "notRequired", dataType: "number"})
