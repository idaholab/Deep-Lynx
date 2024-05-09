import {User} from '../../../domain_objects/access_management/user';
import Logger from '../../../services/logger';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeKey from '../../../domain_objects/data_warehouse/ontology/metatype_key';
import MetatypeKeyMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import Node from '../../../domain_objects/data_warehouse/data/node';
import faker from 'faker';
import {expect} from 'chai';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import MetatypeMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import NodeMapper from '../../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';
import DataTargetRecord, {HttpDataTargetConfig} from '../../../domain_objects/data_warehouse/export/data_target';
import DataTargetRepository, {DataTargetFactory} from '../../../data_access_layer/repositories/data_warehouse/export/data_target_repository';
import ExportRepository from '../../../data_access_layer/repositories/data_warehouse/export/export_repository';
import MetatypeRelationship from '../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import Cache from '../../../services/cache/cache';
import cache from '../../../services/cache/cache';

// some general tests on data targets that aren't specific to the implementation
describe('An HTTP Data Target can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let config: HttpDataTargetConfig;
    let dataSourceID = '';
    let nodes: Node[] = [];
    let metatype: Metatype;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
            this.skip();
        }

        if (process.env.HTTP_DATA_TARGET_URL === '' || !process.env.HTTP_DATA_TARGET_URL) {
            Logger.debug('skipping HTTP data target tests, no data target URL');
            this.skip();
        }

        await PostgresAdapter.Instance.init();
        const mapper = ContainerStorage.Instance;

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

        const nMapper = NodeMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const mkMapper = MetatypeKeyMapper.Instance;
        const mrMapper = MetatypeRelationshipMapper.Instance;

        const metatypeResult = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: 'Movie',
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatypeResult.isError).false;
        expect(metatypeResult.value).not.empty;
        metatype = metatypeResult.value;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.id));
        const keys = await mkMapper.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const relList = [
            new MetatypeRelationship({
                container_id: containerID,
                name: 'includes',
                description: 'album includes song',
            }),
            new MetatypeRelationship({
                container_id: containerID,
                name: 'memberOf',
                description: 'musician member of band',
            }),
            new MetatypeRelationship({
                container_id: containerID,
                name: 'performs',
                description: 'musician/band performs song',
            }),
            new MetatypeRelationship({
                container_id: containerID,
                name: 'features',
                description: 'song/album features musician/band',
            }),
        ];

        const relResults = await mrMapper.BulkCreate('test suite', relList);
        expect(relResults.isError).false;
        expect(relResults.value).not.empty;
        expect(relResults.value.length).eq(4);

        const nodeList = [];
        const genres = ['action', 'comedy', 'romance', 'scifi'];
        function getYear() {
            return Math.floor(Math.random() * (2020 - 1950) + 1950);
        }

        for (let i = 0; i < 4; i++) {
            const node = new Node({
                container_id: containerID,
                metatype: metatype.id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)],
                    year: getYear(),
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(node);
        }

        const nodeResults = await nMapper.BulkCreateOrUpdateByCompositeID('test suite', nodeList);

        expect(nodeResults.isError, metatypeResult.error?.error).false;
        expect(nodeResults.value.length).eq(4);
        nodes = nodeResults.value;

        const movie = nodes.slice(0, 4);
        expect(movie.length).eq(4);
        expect(movie[0].metatype!.id).eq(metatype.id);
        expect(movie[3].metatype!.id).eq(metatype.id);

        config = new HttpDataTargetConfig({
            endpoint: process.env.HTTP_DATA_TARGET_URL as string,
            auth_method: process.env.HTTP_DATA_TARGET_AUTH_METHOD ? (process.env.HTTP_DATA_TARGET_AUTH_METHOD as 'token' | 'basic' | 'none') : 'none',
            username: process.env.HTTP_DATA_TARGET_USERNAME,
            password: process.env.HTTP_DATA_TARGET_PASSWORD,
            token: process.env.HTTP_DATA_TARGET_TOKEN,
            poll_interval: '1 second', // don't want to have this poll more than once
            graphql_query: '{metatypes {Movie {name}}}',
        });

        return Promise.resolve();
    });

    after(async () => {
        if (process.env.CORE_DB_CONNECTION_STRING !== '' && process.env.HTTP_DATA_TARGET_URL !== '' && process.env.HTTP_DATA_TARGET_URL) {
            await UserMapper.Instance.Delete(user.id!);
            await DataSourceMapper.Instance.Delete(dataSourceID);
            await ContainerMapper.Instance.Delete(containerID);
            return PostgresAdapter.Instance.close();
        }

        return Promise.resolve();
    });

    it('successfully poll data using GraphQL and send to dataTarget', async () => {
        // first create and send to target
        const dataTargetRepo = new DataTargetRepository();

        let target = await new DataTargetFactory().fromDataTargetRecord(
            new DataTargetRecord({
                container_id: containerID,
                name: 'Test HTTP Data Target',
                active: true,
                adapter_type: 'http',
                config: config,
                data_format: 'json',
            }),
        );

        let results = await dataTargetRepo.save(target!, user);
        expect(results.isError).false;
        expect(target!.DataTargetRecord?.id).not.undefined;

        await target?.Run();

        // first fetch the data target and verify we haven't encountered an error
        // the status should still be set to "ready"
        const fetchedTarget = await dataTargetRepo.findByID(target?.DataTargetRecord!.id!);
        expect(fetchedTarget.isError).false;
        expect(fetchedTarget.value.DataTargetRecord?.status).eq('ready');

        const key = 'dataTargetLock' + fetchedTarget.value.DataTargetRecord?.id;
        const cachedTarget = await Cache.get(key);
        expect(cachedTarget).to.equal(undefined);

        return Promise.resolve();
    });
});

const test_keys: MetatypeKey[] = [
    new MetatypeKey({
        name: 'Test',
        description: 'object name',
        required: true,
        property_name: 'name',
        data_type: 'string',
    }),
    new MetatypeKey({
        name: 'Test Not Required',
        description: 'genre',
        required: false,
        property_name: 'genre',
        data_type: 'enumeration',
        options: ['action', 'comedy', 'romance', 'scifi'],
    }),
    new MetatypeKey({
        name: 'Test Not Required 2',
        description: 'release of movie',
        required: false,
        property_name: 'year',
        data_type: 'number',
    }),
];
