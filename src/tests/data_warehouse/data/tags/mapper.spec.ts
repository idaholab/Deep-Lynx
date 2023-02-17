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

    const cMapper = ContainerStorage.Instance;
    const dsMapper = DataSourceMapper.Instance;
    const tMapper = TagMapper.Instance;

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
        const tMapper = TagMapper.Instance;
        const nMapper = NodeMapper.Instance;
        const mMapper = MetatypeMapper.Instance;

        // Create the metatype
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

        // Create the node
        const node = await nMapper.CreateOrUpdateByCompositeID(
            'test suite',
            new Node({
                container_id: containerID,
                metatype: metatype.value,
                properties: {},
            }),
        );

        expect(node.isError, metatype.error?.error).false;

        // Tag the node
        const tagNode = await tMapper.TagNode(tagID, node.value.id!);

        expect(tagNode.value).true;

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
        const eMapper = EdgeMapper.Instance;
        const nMapper = NodeMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rpMapper = MetatypeRelationshipPairMapper.Instance;

        // Create the Metatype
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

        // Create the Nodes
        const node_a = await nMapper.CreateOrUpdateByCompositeID(
            'test suite',
            new Node({
                container_id: containerID,
                metatype: metatype.value,
                properties: {
                    node: 'a',
                },
            }),
        );
        const node_b = await nMapper.CreateOrUpdateByCompositeID(
            'test suite',
            new Node({
                container_id: containerID!,
                metatype: metatype.value,
                properties: {
                    node: 'b',
                },
            }),
        );

        expect(node_a.isError).false;
        expect(node_b.isError).false;
        expect(node_a.value).not.empty;
        expect(node_b.value).not.empty;

        // Create the Relationship
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

        // Create the Relationship Metatype
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

        // Create the Edge
        const edge = await eMapper.Create(
            'test suite',
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pair.value.id!,
                properties: {},
                origin_id: node_a.value.id,
                destination_id: node_b.value.id,
            }),
        );

        expect(edge.isError).false;
        expect(edge.value).not.empty;

        // Tag the Edge
        const tagEdge = await tMapper.TagEdge(tagID, edge.value.id!);

        expect(tagEdge.value).true;

        return Promise.resolve();
    });
});
