import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import NodeLeafRepository from '../../../../data_access_layer/repositories/data_warehouse/data/node_leaf_repository';
import NodeLeaf from '../../../../domain_objects/data_warehouse/data/node_leaf';
import {User} from '../../../../domain_objects/access_management/user';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import MetatypeMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import MetatypeKeyMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import MetatypeKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import NodeRepository from '../../../../data_access_layer/repositories/data_warehouse/data/node_repository';
import Node from '../../../../domain_objects/data_warehouse/data/node';
import MetatypeRelationshipMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRelationshipPairMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipPair from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import NodeMapper from '../../../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import MetatypeRelationshipKeyMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_key_mapper';
import Edge from '../../../../domain_objects/data_warehouse/data/edge';
import EdgeMapper from '../../../../data_access_layer/mappers/data_warehouse/data/edge_mapper';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import MetatypeRelationshipKey from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_key';
import { realpath } from 'fs';
import EdgeRepository from '../../../../data_access_layer/repositories/data_warehouse/data/edge_repository';

describe('A NodeLeaf Repository', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let pair: MetatypeRelationshipPair;
    let nodes: Node[] = [];
    let dataSourceID: string = '';
    let metatype: Metatype;
    let edges: Edge[] = [];

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping node leaf tests, no mapper layer');
            this.skip();
        }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const mKeyMapper = MetatypeKeyMapper.Instance;
        const nMapper = NodeMapper.Instance;
        const mrMapper = MetatypeRelationshipMapper.Instance;
        const mrKeyMapper = MetatypeRelationshipKeyMapper.Instance;
        const pairMapper = MetatypeRelationshipPairMapper.Instance;
        const eMapper = EdgeMapper.Instance;

        const container = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(container.isError).false;
        expect(container.value.id).not.null;
        containerID = container.value.id!;

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

        const ds = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(ds.isError).false;
        expect(ds.value).not.empty;
        dataSourceID = ds.value.id!;

        const metatypes = await mMapper.BulkCreate('test suite', [
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        ]);

        expect(metatypes.isError).false;
        expect(metatypes.value).not.empty;

        const testKeys1 = [...test_keys];
        testKeys1.forEach((key) => (key.metatype_id = metatypes.value[0].id!));
        const keys = await mKeyMapper.BulkCreate('test suite', testKeys1);
        expect(keys.isError).false;

        const testKeys2 = [...test_keys];
        testKeys2.forEach((key) => (key.metatype_id = metatypes.value[1].id!));
        const keys2 = await mKeyMapper.BulkCreate('test suite', testKeys2);
        expect(keys2.isError).false;

        const nodeList = [
            new Node({
                container_id: containerID,
                metatype: metatypes.value[0].id!,
                properties: payload,
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            }),
            new Node({
                container_id: containerID,
                metatype: metatypes.value[1].id!,
                properties: payload,
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            }),
        ];

        const saveNodes = await nMapper.BulkCreateOrUpdateByCompositeID('test suite', nodeList);
        expect(saveNodes.isError, metatypes.error?.error).false;

        nodes = saveNodes.value;

        const relationship = await mrMapper.Create(
            'test suite',
            new MetatypeRelationship({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        const relationshipTestKeys = [...test_rel_keys];
        relationshipTestKeys.forEach((key) => (key.metatype_relationship_id = relationship.value.id!));

        const rKeys = await mrKeyMapper.BulkCreate('test suite', relationshipTestKeys);
        expect(rKeys.isError).false;

        const relPair = await pairMapper.Create(
            'test suite',
            new MetatypeRelationshipPair({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes.value[0].id!,
                destination_metatype: metatypes.value[1].id!,
                relationship: relationship.value.id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
        );

        expect(relPair.isError).false;
        pair = relPair.value;

        return Promise.resolve();
    });

    after(async () => {
        await DataSourceMapper.Instance.Delete(dataSourceID);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can do stuff', async () => {
        const edgeRepo = new EdgeRepository();
        
        let edge = new Edge({
            container_id: containerID,
            metatype_relationship_pair: pair.id!,
            properties: payload,
            origin_id: nodes[0].id,
            destination_id: nodes[1].id,
        });

        let saved = await edgeRepo.save(edge, user);
        expect(saved.isError).false;
        expect(edge.id).not.undefined;

        return edgeRepo.delete(edge);
    })
});

const test_keys: MetatypeKey[] = [
    new MetatypeKey({
        name: 'Test',
        description: 'flower name',
        required: true,
        property_name: 'flower_name',
        data_type: 'string'
    }),
    new MetatypeKey({
        name: 'Test2',
        description: 'allowed flower color',
        required: true,
        property_name: 'color',
        data_type: 'enumeration',
        options: ['yellow', 'blue'],
    }),
    new MetatypeKey({
        name: 'Test not required',
        description: 'not required',
        required: false,
        property_name: 'notRequired',
        data_type: 'number'
    }),
];

const payload: {[key: string]: any} = {
    flower_name: 'Tulip',
    color: 'yellow',
    notRequired: 1234,
};

const test_rel_keys: MetatypeRelationshipKey[] = [
    new MetatypeRelationshipKey({
        name: 'Test',
        description: 'flower name',
        required: true,
        property_name: 'flower_name',
        data_type: 'string',
    }),
    new MetatypeRelationshipKey({
        name: 'Test2',
        description: 'color of flower allowed',
        required: true,
        property_name: 'color',
        data_type: 'enumeration',
        options: ['yellow', 'blue'],
    }),
    new MetatypeRelationshipKey({
        name: 'Test Not Required',
        description: 'not required',
        required: false,
        property_name: 'notRequired',
        data_type: 'number',
    }),
];