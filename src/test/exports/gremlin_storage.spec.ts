/* tslint:disable */
import Logger from "../../logger";
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import MetatypeKeyStorage from "../../data_storage/metatype_key_storage";
import MetatypeStorage from "../../data_storage/metatype_storage";
import faker from "faker";
import {expect} from "chai";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import GraphStorage from "../../data_storage/graph/graph_storage";
import NodeStorage from "../../data_storage/graph/node_storage";
import ContainerStorage from "../../data_storage/container_storage";
import EdgeStorage from "../../data_storage/graph/edge_storage";
import MetatypeRelationshipStorage from "../../data_storage/metatype_relationship_storage";
import MetatypeRelationshipPairStorage from "../../data_storage/metatype_relationship_pair_storage";
import ExportStorage from "../../data_storage/export/export_storage";
import GremlinExportStorage from "../../data_storage/export/gremlin_export_storage";

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
        let storage = ContainerStorage.Instance;

        let container = await storage.Create( "test suite", {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value[0].id!;

        return Promise.resolve()
    });

    it('can initiate export by copying nodes and edges', async(done)=> {
        const storage = EdgeStorage.Instance;
        const nStorage = NodeStorage.Instance;
        const kStorage = MetatypeKeyStorage.Instance;
        const mStorage = MetatypeStorage.Instance;
        const gStorage = GraphStorage.Instance;
        const rStorage = MetatypeRelationshipStorage.Instance;
        const rpStorage = MetatypeRelationshipPairStorage.Instance;

        // SETUP CREATE NODES AND EDGE
        let graph = await gStorage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const metatype = await mStorage.Create(containerID, "test suite",
            [
                {"name": faker.name.findName(), "description": faker.random.alphaNumeric()},
                {"name": faker.name.findName(), "description": faker.random.alphaNumeric()},
            ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        const keys2 = await kStorage.Create(metatype.value[1].id!, "test suite", test_keys);
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

        let relationship = await rStorage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create(containerID, "test suite", {
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype_id": metatype.value[0].id,
            "destination_metatype_id": metatype.value[1].id,
            "metatype_relationship_id": relationship.value[0].id,
            "relationship_type": "one:one"
        });

        // EDGE SETUP
        let edge = await storage.CreateOrUpdate(containerID, graph.value.id,  {
            relationship_pair_id: pair.value[0].id,
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

const test_keys: MetatypeKeyT[] = [{
    name: "Test",
    property_name: "flower",
    required: true,
    description: "flower name",
    data_type: "string"
},
    {
        name: "Test 2",
        property_name: "color",
        required: true,
        description: "color of flower allowed",
        data_type: "enumeration",
        options: ["yellow", "blue"]
    },
    {
        name: "Test Not Required",
        property_name: "notRequired",
        required: false,
        description: "not required",
        data_type: "number",
    },
];

export const single_test_key: MetatypeKeyT = {
    name: "Test Not Required",
    property_name: "notRequired",
    required: false,
    description: "not required",
    data_type: "number",
};
