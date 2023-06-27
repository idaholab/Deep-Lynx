// Domain Objects
import Tag from '../../../../domain_objects/data_warehouse/data/tag';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipPair from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import File from '../../../../domain_objects/data_warehouse/data/file';
import Node from '../../../../domain_objects/data_warehouse/data/node';
import Edge from '../../../../domain_objects/data_warehouse/data/edge';

// Logger
import Logger from '../../../../services/logger';

// Testing
import faker from 'faker';
import {expect} from 'chai';

// Mappers
import TagMapper from '../../../../data_access_layer/mappers/data_warehouse/data/tag_mapper';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import NodeMapper from '../../../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import MetatypeMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import MetatypeRelationshipMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRelationshipPairMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import FileMapper from '../../../../data_access_layer/mappers/data_warehouse/data/file_mapper';

// PostgreSQL
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import EdgeMapper from '../../../../data_access_layer/mappers/data_warehouse/data/edge_mapper';

describe('TagMapper', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let tagID: string = '';
    let tagName: string = '';
    let nodes: Node[] = [];
    let edges: Edge[] = [];

    const cMapper = ContainerStorage.Instance;
    const dsMapper = DataSourceMapper.Instance;
    const tMapper = TagMapper.Instance;
    const mMapper = MetatypeMapper.Instance;
    const rMapper = MetatypeRelationshipMapper.Instance;
    const rpMapper = MetatypeRelationshipPairMapper.Instance;
    const nMapper = NodeMapper.Instance;
    const eMapper = EdgeMapper.Instance;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping tags graph tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();

        // Create the Container
        const container = await cMapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(container.isError).false;
        expect(container.value.id).not.null;
        containerID = container.value.id!;

        // Create the DataSource
        const dataSource = await dsMapper.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(dataSource.isError).false;
        expect(dataSource.value).not.empty;

        // Create the Tag
        const tag = await tMapper.Create(
            'test suite',
            new Tag({
                tag_name: faker.name.findName(),
                container_id: containerID,
            }),
        );

        expect(tag.isError).false;
        expect(tag.value.id).not.null;
        tagID = tag.value.id!;
        tagName = tag.value.tag_name!;

        // Create a metatype
        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        // Create a relationship type
        const relationship = await rMapper.Create(
            'test suite',
            new MetatypeRelationship({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        // Create a relationship pair
        const pair = await rpMapper.Create(
            'test suite',
            new MetatypeRelationshipPair({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                origin_metatype: metatype.value.id!,
                destination_metatype: metatype.value.id!,
                relationship: relationship.value.id!,
                relationship_type: 'one:one',
                container_id: containerID,
            }),
        );

        expect(pair.isError).false;
        expect(pair.value).not.empty;

        // Create some test nodes
        const nodeObjects = [
            new Node({
                container_id: containerID,
                metatype: metatype.value,
                properties: {name: "nodeA"},
            }),
            new Node({
                container_id: containerID,
                metatype: metatype.value,
                properties: {name: "nodeB"},
            }),
            new Node({
                container_id: containerID,
                metatype: metatype.value,
                properties: {name: "nodeC"},
            }),
        ];

        const nodesCreated = await nMapper.BulkCreateOrUpdateByCompositeID('test suite', nodeObjects);
        expect(nodesCreated.isError, nodesCreated.error?.error).false;
        nodes = nodesCreated.value;

        // Create some test edges
        const edgeObjects = [
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pair.value.id!,
                properties: {name: "edgeA"},
                origin_id: nodes[0].id,
                destination_id: nodes[1].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pair.value.id!,
                properties: {name: "edgeB"},
                origin_id: nodes[1].id,
                destination_id: nodes[2].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pair.value.id!,
                properties: {name: "edgeC"},
                origin_id: nodes[2].id,
                destination_id: nodes[0].id,
            }),
        ];

        const edgesCreated = await eMapper.BulkCreate('test suite', edgeObjects);
        expect(edgesCreated.isError, edgesCreated.error?.error).false;
        edges = edgesCreated.value;

        return Promise.resolve();
    });

    after(async () => {
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can create a tag', async () => {
        const tag = await tMapper.Create(
            'test suite',
            new Tag({
                tag_name: faker.name.findName(),
                container_id: containerID,
            }),
        );

        expect(tag.isError).false;
        expect(tag.value.id).not.null;

        return Promise.resolve();
    });

    it('can update a tag', async () => {
        const tag = await tMapper.Update(
            'test suite',
            new Tag({
                id: tagID,
                tag_name: faker.name.findName(),
                container_id: containerID,
            }),
        );

        expect(tag.isError).false;
        expect(tag.value.id).equal(tagID);
        expect(tag.value.tag_name).not.equal(tagName);

        return Promise.resolve();
    });

    it('can tag a node', async () => {
        const tagNode = await tMapper.TagNode(tagID, nodes[0].id!);

        expect(tagNode.value).true;

        const tagged = await tMapper.NodesWithTag(tagID);
        expect(tagged.isError, tagged.error?.error).false;
        const taggedNodeIDs = tagged.value.map(n => n.id!);
        expect(taggedNodeIDs.includes(nodes[0].id!));

        return Promise.resolve();
    });

    it('can tag a file', async () => {
        const fMapper = FileMapper.Instance;

        // Create the file
        const file = await fMapper.Create(
            'test suite',
            new File({
                container_id: containerID,
                file_name: faker.name.findName(),
                file_size: 100,
                adapter_file_path: faker.name.findName(),
                adapter: 'filesystem',
            }),
        );

        expect(file.isError).false;
        expect(file.value).not.empty;

        // Tag the file
        const tagFile = await tMapper.TagFile(tagID, file.value.id!);

        expect(tagFile.value).true;

        return Promise.resolve();
    });

    it('can tag an edge', async () => {
        const tagEdge = await tMapper.TagEdge(tagID, edges[0].id!);

        expect(tagEdge.value).true;

        const tagged = await tMapper.EdgesWithTag(tagID);
        expect(tagged.isError, tagged.error?.error).false;
        const taggedEdgeIDs = tagged.value.map(e => e.id!);
        expect(taggedEdgeIDs.includes(edges[0].id!));

        return Promise.resolve();
    });

    it('can bulk tag nodes', async () => {
        const nodeIDs = nodes.map((n) => n.id!);
        const tagNodes = await tMapper.BulkTagNode(tagID, nodeIDs);
        expect(tagNodes.isError, tagNodes.error?.error).false;
        expect(tagNodes.value).true;

        const tagged = await tMapper.NodesWithTag(tagID);
        expect(tagged.isError, tagged.error?.error).false;
        const taggedNodeIDs = tagged.value.map(n => n.id!);
        nodeIDs.forEach(id => {
            expect(taggedNodeIDs.includes(id));
        });

        return Promise.resolve();
    });

    it('can bulk detach a tag from nodes', async () => {
        const nodeIDs = nodes.map((n) => n.id!);
        const detachTag = await tMapper.BulkDetachNodeTag(tagID, nodeIDs);
        expect(detachTag.isError, detachTag.error?.error).false;
        expect(detachTag.value).true;

        const tagged = await tMapper.NodesWithTag(tagID);
        expect(tagged.isError, tagged.error?.error).false;
        const taggedNodeIDs = tagged.value.map(n => n.id!);
        nodeIDs.forEach(id => {
            expect(taggedNodeIDs.includes(id)).false;
        });

        return Promise.resolve();
    });

    it('can bulk tag edges', async () => {
        const edgeIDs = edges.map((e) => e.id!);
        const tagEdges = await tMapper.BulkTagEdge(tagID, edgeIDs);
        expect(tagEdges.isError, tagEdges.error?.error).false;
        expect(tagEdges.value).true;

        const tagged = await tMapper.EdgesWithTag(tagID);
        expect(tagged.isError, tagged.error?.error).false;
        const taggedEdgeIDs = tagged.value.map(e => e.id!);
        edgeIDs.forEach(id => {
            expect(taggedEdgeIDs.includes(id));
        });

        return Promise.resolve();
    });

    it('can bulk detach a tag from edges', async () => {
        const edgeIDs = edges.map((e) => e.id!);
        const detachTag = await tMapper.BulkDetachEdgeTag(tagID, edgeIDs);
        expect(detachTag.isError, detachTag.error?.error).false;
        expect(detachTag.value).true;

        const tagged = await tMapper.EdgesWithTag(tagID);
        expect(tagged.isError, tagged.error?.error).false;
        const taggedEdgeIDs = tagged.value.map(e => e.id!);
        edgeIDs.forEach(id => {
            expect(taggedEdgeIDs.includes(id)).false;
        });

        return Promise.resolve();
    });
});
