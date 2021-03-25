/* tslint:disable */
import MetatypeKey from "../../../../data_warehouse/ontology/metatype_key";
import MetatypeRelationshipKey from "../../../../data_warehouse/ontology/metatype_relationship_key";
import {User} from "../../../../access_management/user";
import Metatype from "../../../../data_warehouse/ontology/metatype";
import Logger from "../../../../services/logger";
import PostgresAdapter from "../../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import ContainerMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import MetatypeMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import MetatypeKeyMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import GraphMapper from "../../../../data_access_layer/mappers/data_warehouse/data/graph_mapper";
import Container from "../../../../data_warehouse/ontology/container";
import faker from "faker";
import {expect} from "chai";
import UserMapper from "../../../../data_access_layer/mappers/access_management/user_mapper";
import MetatypeRelationshipMapper
    from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper";
import MetatypeRelationshipPairMapper
    from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper";
import Node from "../../../../data_warehouse/data/node";
import MetatypeRelationship from "../../../../data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipPair from "../../../../data_warehouse/ontology/metatype_relationship_pair";
import NodeMapper from "../../../../data_access_layer/mappers/data_warehouse/data/node_mapper";
import MetatypeRelationshipKeyMapper
    from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_key_mapper";
import Edge from "../../../../data_warehouse/data/edge";
import EdgeRepository from "../../../../data_access_layer/repositories/data_warehouse/data/edge_repository";
import DataSourceMapper from "../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper";
import DataSourceRecord from "../../../../data_warehouse/import/data_source";

describe('An Edge Repository', async() => {
    let containerID: string = process.env.TEST_CONTAINER_ID || "";
    let user: User
    let graphID: string = ""
    let pair: MetatypeRelationshipPair
    let nodes: Node[] = []
    let dataSourceID: string = ""

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping metatype tests, no mapper layer");
            this.skip()
        }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const nMapper = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const rkStorage = MetatypeRelationshipKeyMapper.Instance;
        const gMapper = GraphMapper.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const pairMapper = MetatypeRelationshipPairMapper.Instance;

        const container = await mapper.Create("test suite", new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric()
        }));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        const userResult = await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value

        let exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;
        dataSourceID = exp.value.id!

        const graph = await gMapper.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;
        graphID = graph.value.id!

        const metatype = await mMapper.BulkCreate("test suite",
            [
                new Metatype({
                    container_id: containerID,
                    name: faker.name.findName(),
                    description: faker.random.alphaNumeric()
                }),
                new Metatype({
                    container_id: containerID,
                    name: faker.name.findName(),
                    description: faker.random.alphaNumeric()
                }),
            ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys1 = [...test_keys]
        testKeys1.forEach(key => key.metatype_id = metatype.value[0].id!)
        const keys = await kStorage.BulkCreate("test suite", testKeys1);
        expect(keys.isError).false;

        const testKeys2 = [...test_keys]
        testKeys2.forEach(key => key.metatype_id = metatype.value[1].id!)
        const keys2 = await kStorage.BulkCreate("test suite", testKeys2);
        expect(keys2.isError).false;

        const mixed = [new Node({
            container_id: containerID,
            graph_id: graph.value.id!,
            metatype: metatype.value[0].id!,
            properties: payload,
            data_source_id: dataSourceID,
            composite_original_id: faker.name.findName()
        }), new Node({
            container_id: containerID,
            graph_id: graph.value.id!,
            metatype: metatype.value[1].id!,
            properties: payload,
            data_source_id: dataSourceID,
            composite_original_id: faker.name.findName()
        })];

        const node = await nMapper.BulkCreateOrUpdateByCompositeID("test suite", mixed);
        expect(node.isError, metatype.error?.error).false;

        nodes = node.value

        const relationship = await rMapper.Create("test suite",
            new MetatypeRelationship({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric()
            }))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        const relationshipTestKeys = [...test_relationship_keys]
        relationshipTestKeys.forEach(key => key.metatype_relationship_id = relationship.value.id!)

        const rkeys = await rkStorage.BulkCreate("test suite", relationshipTestKeys)
        expect(rkeys.isError).false

        const rpair = await pairMapper.Create("test suite", new MetatypeRelationshipPair({
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype": metatype.value[0].id!,
            "destination_metatype": metatype.value[1].id!,
            "relationship": relationship.value.id!,
            "relationship_type": "many:many",
            container_id: containerID,
        }));

        expect(rpair.isError)
        pair = rpair.value


        return Promise.resolve()
    });

    after(async () => {
        await UserMapper.Instance.PermanentlyDelete(user.id!)
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('can save an Edge', async() => {
        const edgeRepo = new EdgeRepository()

        let edge =  new Edge({
            container_id: containerID,
            graph_id: graphID,
            metatype_relationship_pair: pair.id!,
            properties: payload,
            origin_node_id: nodes[0].id,
            destination_node_id: nodes[1].id
        });

        // normal save first
        let saved = await edgeRepo.save(edge, user)
        expect(saved.isError).false
        expect(edge.id).not.undefined

        // nodes by original composite id's
        edge =  new Edge({
            container_id: containerID,
            graph_id: graphID,
            metatype_relationship_pair: pair.id!,
            properties: payload,
            composite_original_id: faker.name.findName(),
            origin_node_composite_original_id: nodes[0].composite_original_id,
            destination_node_composite_original_id: nodes[0].composite_original_id,
            data_source_id: dataSourceID
        });

        saved = await edgeRepo.save(edge, user)
        expect(saved.isError).false

        // check that save works with a composite original id
        let originalID = edge.id!
        edge.id = undefined

        saved = await edgeRepo.save(edge, user)
        expect(saved.isError).false
        expect(edge.id).eq(originalID)
        expect(edge.properties).to.have.deep.property('flower_name', "Daisy")

        // update the properties
        edge.properties = updatePayload

        saved = await edgeRepo.save(edge, user)
        expect(saved.isError).false
        expect(edge.properties).to.have.deep.property('flower_name', "Violet")

        edge.properties = malformed_payload

        saved = await edgeRepo.save(edge, user)
        expect(saved.isError).true

        return edgeRepo.delete(edge)
    })

    it('can bulk save an Edge', async() => {
        const edgeRepo = new EdgeRepository()

        let edges =  [new Edge({
            container_id: containerID,
            graph_id: graphID,
            metatype_relationship_pair: pair.id!,
            properties: payload,
            origin_node_id: nodes[0].id,
            destination_node_id: nodes[1].id
        }), new Edge({
            container_id: containerID,
            graph_id: graphID,
            metatype_relationship_pair: pair.id!,
            properties: payload,
            origin_node_id: nodes[0].id,
            destination_node_id: nodes[1].id
        })];

        // normal save first
        let saved = await edgeRepo.bulkSave(user, edges)
        expect(saved.isError).false
        edges.forEach(edge => {
            expect(edge.id).not.undefined
            expect(edge.properties).to.have.deep.property('flower_name', "Daisy")
        })

        edges[0].properties = updatePayload
        edges[1].properties = updatePayload

        saved = await edgeRepo.bulkSave(user, edges)
        expect(saved.isError).false
        edges.forEach(edge => {
            expect(edge.properties).to.have.deep.property('flower_name', "Violet")
        })

        edges[0].properties = malformed_payload

        saved = await edgeRepo.bulkSave(user, edges)
        expect(saved.isError).true

        await edgeRepo.delete(edges[0])
        return edgeRepo.delete(edges[1])
    })
})

const payload: {[key:string]:any} = {
    "flower_name": "Daisy",
    "color": "yellow",
    "notRequired": 1
};

const updatePayload : {[key:string]:any} = {
    "flower_name": "Violet",
    "color": "blue",
    "notRequired": 1
};

const malformed_payload: {[key:string]:any} = {
    "flower": "Daisy",
    "notRequired": 1
};

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({name: "Test", description: "flower name", required: true, property_name: "flower_name", data_type: "string"}),
    new MetatypeKey({name: "Test2", description: "color of flower allowed", required: true, property_name: "color", data_type: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeKey({name: "Test Not Required", description: "not required", required: false, property_name: "notRequired", data_type: "number"}),
];

export const test_relationship_keys: MetatypeRelationshipKey[] = [
    new MetatypeRelationshipKey({name: "Test", description: "flower name", required: true, property_name: "flower_name", data_type: "string"}),
    new MetatypeRelationshipKey({name: "Test2", description: "color of flower allowed", required: true, property_name: "color", data_type: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeRelationshipKey({name: "Test Not Required", description: "not required", required: false, property_name: "notRequired", data_type: "number"}),
];
