// Domain Objects
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import Tag from '../../../../domain_objects/data_warehouse/data/tag';
import {User} from '../../../../domain_objects/access_management/user';
import File from '../../../../domain_objects/data_warehouse/data/file';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import Node from '../../../../domain_objects/data_warehouse/data/node';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipPair from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import Edge from '../../../../domain_objects/data_warehouse/data/edge';

// Mappers
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import MetatypeMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import MetatypeRelationshipMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRelationshipPairMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import NodeMapper from '../../../../data_access_layer/mappers/data_warehouse/data/node_mapper';

// Repository
import TagRepository from '../../../../data_access_layer/repositories/data_warehouse/data/tag_repository';
import FileRepository from '../../../../data_access_layer/repositories/data_warehouse/data/file_repository';
import EdgeRepository from '../../../../data_access_layer/repositories/data_warehouse/data/edge_repository';

// Services
import Logger from '../../../../services/logger';

// Testing
import faker from 'faker';
import {expect} from 'chai';
import TagMapper from '../../../../data_access_layer/mappers/data_warehouse/data/tag_mapper';
import EdgeMapper from '../../../../data_access_layer/mappers/data_warehouse/data/edge_mapper';

describe('A tag repository can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let dataSourceID: string = '';
    let user: User;

    const cMapper = ContainerStorage.Instance;
    const mMapper = MetatypeMapper.Instance;
    const rMapper = MetatypeRelationshipMapper.Instance;
    const rpMapper = MetatypeRelationshipPairMapper.Instance;
    const nMapper = NodeMapper.Instance;
    const eMapper = EdgeMapper.Instance;

    let nodes: Node[] = [];
    let edges: Edge[] = [];

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
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

        // Create the data source
        const exp = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        dataSourceID = exp.value.id!;

        // Create a user
        const userResult = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser'],
            }),
        );

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value;

        // Create a metatype
        const metatype = await mMapper.Create('test suite',
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
                relationship_type: 'many:many',
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
        await cMapper.Delete(containerID);
        await UserMapper.Instance.Delete(user.id!);
        return PostgresAdapter.Instance.close();
    });

    it('can save a tag', async () => {
        const tagRepo = new TagRepository();

        const tag = new Tag({
            tag_name: faker.name.findName(),
            container_id: containerID,
            metadata: {
                metadata: 'metadata',
            },
        });

        let saved = await tagRepo.save(tag, user);
        expect(saved.isError).false;
        expect(saved.value).true;
    });

    it('can list webgl files and tags', async () => {
        const tagRepo = new TagRepository();

        const tag = new Tag({
            tag_name: faker.name.findName(),
            container_id: containerID,
            metadata: {
                webgl: 'true',
            },
        });

        let savedTag = await tagRepo.save(tag, user);

        expect(savedTag.isError).false;
        expect(savedTag.value).true;

        const fileRepo = new FileRepository();
        const file = new File({
            file_name: faker.name.findName(),
            file_size: 200,
            md5hash: '',
            adapter_file_path: faker.name.findName(),
            adapter: 'filesystem',
            data_source_id: dataSourceID,
            container_id: containerID,
        });

        let savedFile = await fileRepo.save(file, user);
        expect(savedFile.isError).false;
        expect(file.id).not.undefined;

        const taggedFile = await tagRepo.tagFile(tag, file);
        expect(taggedFile.isError).false;
        expect(taggedFile.value).true;

        const webglFile = await tagRepo.listWebglFilesAndTags(containerID);
        expect(webglFile.isError).false;
        expect(webglFile.value).lengthOf(1);
    });

    it('can attach and detach tags', async () => {
        const tagRepo = new TagRepository();

        const tag = new Tag({
            tag_name: faker.name.findName(),
            container_id: containerID,
            metadata: {
                webgl: 'true',
            },
        });

        let savedTag = await tagRepo.save(tag, user);

        expect(savedTag.isError).false;
        expect(savedTag.value).true;

        const fileRepo = new FileRepository();
        const file = new File({
            file_name: faker.name.findName(),
            file_size: 200,
            md5hash: '',
            adapter_file_path: faker.name.findName(),
            adapter: 'filesystem',
            data_source_id: dataSourceID,
            container_id: containerID,
        });

        let savedFile = await fileRepo.save(file, user);
        expect(savedFile.isError).false;
        expect(file.id).not.undefined;

        // now attach and then detach tags to the created file, nodes, and edge

        const taggedFile = await tagRepo.tagFile(tag, file);
        expect(taggedFile.isError).false;
        expect(taggedFile.value).true;

        const taggedNode = await tagRepo.tagNode(tag, nodes[0]);
        expect(taggedNode.isError).false;
        expect(taggedNode.value).true;

        const taggedEdge = await tagRepo.tagEdge(tag, edges[0]);
        expect(taggedEdge.isError).false;
        expect(taggedEdge.value).true;

        const detachFileFlag = await tagRepo.detachTagFromFile(tag, file);
        expect(detachFileFlag.isError).false;
        expect(detachFileFlag.value).true;

        const detachedNodeFlag = await tagRepo.detachTagFromNode(tag, nodes[0]);
        expect(detachedNodeFlag.isError).false;
        expect(detachedNodeFlag.value).true;

        const detachedEdgeFlag = await tagRepo.detachTagFromEdge(tag, edges[0]);
        expect(detachedEdgeFlag.isError).false;
        expect(detachedEdgeFlag.value).true;
    });

    it('can bulk attach and detach node tags', async () => {
        const tagRepo = new TagRepository();

        const tag = new Tag({
            tag_name: faker.name.findName(),
            container_id: containerID,
            metadata: {
                webgl: 'true',
            },
        });

        let savedTag = await tagRepo.save(tag, user);

        expect(savedTag.isError).false;
        expect(savedTag.value).true;
        
        const nodeIDs = nodes.map((n) => n.id!);
        
        const tagNodes = await tagRepo.bulkTagNode(tag, nodeIDs);
        expect(tagNodes.isError, tagNodes.error?.error).false;
        expect(tagNodes.value).true;

        let tagged = await tagRepo.listNodesWithTag(tag);
        expect(tagged.isError, tagged.error?.error).false;
        let taggedNodeIDs = tagged.value.map(n => n.id!);
        nodeIDs.forEach(id => {
            expect(taggedNodeIDs.includes(id));
        });

        const detachTag = await tagRepo.bulkDetachNodeTag(tag, nodeIDs);
        expect(detachTag.isError, detachTag.error?.error).false;
        expect(detachTag.value).true;

        tagged = await tagRepo.listNodesWithTag(tag);
        expect(tagged.isError, tagged.error?.error).false;
        taggedNodeIDs = tagged.value.map(n => n.id!);
        nodeIDs.forEach(id => {
            expect(taggedNodeIDs.includes(id)).false;
        });
    });

    it('can bulk attach and detach edge tags', async () => {
        const tagRepo = new TagRepository();

        const tag = new Tag({
            tag_name: faker.name.findName(),
            container_id: containerID,
            metadata: {
                webgl: 'true',
            },
        });

        let savedTag = await tagRepo.save(tag, user);

        expect(savedTag.isError).false;
        expect(savedTag.value).true;
        
        const edgeIDs = edges.map((e) => e.id!);
        
        const tagEdges = await tagRepo.bulkTagEdge(tag, edgeIDs);
        expect(tagEdges.isError, tagEdges.error?.error).false;
        expect(tagEdges.value).true;

        let tagged = await tagRepo.listEdgesWithTag(tag);
        expect(tagged.isError, tagged.error?.error).false;
        let taggedEdgeIDs = tagged.value.map(e => e.id!);
        edgeIDs.forEach(id => {
            expect(taggedEdgeIDs.includes(id));
        });

        const detachTag = await tagRepo.bulkDetachEdgeTag(tag, edgeIDs);
        expect(detachTag.isError, detachTag.error?.error).false;
        expect(detachTag.value).true;

        tagged = await tagRepo.listEdgesWithTag(tag);
        expect(tagged.isError, tagged.error?.error).false;
        taggedEdgeIDs = tagged.value.map(e => e.id!);
        edgeIDs.forEach(id => {
            expect(taggedEdgeIDs.includes(id)).false;
        });
    });
});

const payload: {[key: string]: any} = {
    flower_name: 'Daisy',
    color: 'yellow',
    notRequired: 1,
};
