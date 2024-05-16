import Logger from '../../services/logger';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import MetatypeKeyMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import MetatypeMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import faker from 'faker';
import {expect} from 'chai';
import NodeMapper from '../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import {graphql, GraphQLSchema} from 'graphql';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../domain_objects/data_warehouse/ontology/metatype';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import MetatypeKey from '../../domain_objects/data_warehouse/ontology/metatype_key';
import Node from '../../domain_objects/data_warehouse/data/node';
import {User} from '../../domain_objects/access_management/user';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import DataSourceMapper from '../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import DataSourceRecord from '../../domain_objects/data_warehouse/import/data_source';
import MetatypeRelationshipMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRelationship from '../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipKey from '../../domain_objects/data_warehouse/ontology/metatype_relationship_key';
import MetatypeRelationshipKeyMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_key_mapper';
import MetatypeRelationshipPair from '../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeRelationshipPairMapper from '../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import EdgeMapper from '../../data_access_layer/mappers/data_warehouse/data/edge_mapper';
import Edge from '../../domain_objects/data_warehouse/data/edge';
import GraphQLRunner from '../../graphql/schema';
import {plainToClass} from 'class-transformer';

describe('Using a new GraphQL Query on graph return we', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let dataSourceID = '';
    let nodes: Node[] = [];
    let edges: Edge[] = [];
    let songs: Node[] = [];
    let metatypes: Metatype[] = [];
    let relationships: MetatypeRelationship[] = [];
    let schema: GraphQLSchema;
    let metatypeIDs: string[] = [];

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping graphQL node query tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;

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
        const mkMapper = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const mrMapper = MetatypeRelationshipMapper.Instance;
        const mrKeyMapper = MetatypeRelationshipKeyMapper.Instance;
        const mrPairMapper = MetatypeRelationshipPairMapper.Instance;
        const eMapper = EdgeMapper.Instance;

        const metatypeResults = await mMapper.BulkCreate('test suite', [
            new Metatype({
                container_id: containerID,
                name: 'Musician',
                description: faker.random.alphaNumeric(),
            }),
            new Metatype({
                container_id: containerID,
                name: 'Band',
                description: faker.random.alphaNumeric(),
            }),
            new Metatype({
                container_id: containerID,
                name: 'Song',
                description: faker.random.alphaNumeric(),
            }),
            new Metatype({
                container_id: containerID,
                name: 'Album',
                description: faker.random.alphaNumeric(),
            }),
        ]);

        expect(metatypeResults.isError).false;
        expect(metatypeResults.value).not.empty;
        expect(metatypeResults.value.length).eq(4);
        metatypes = metatypeResults.value;

        metatypes.forEach(async (mt) => {
            const testKeys = [...test_keys];
            testKeys.forEach((key) => (key.metatype_id = mt.id));
            const keys = await mkMapper.BulkCreate('test suite', testKeys);
            expect(keys.isError).false;
            metatypeIDs.push(mt.id!);
        });

        const nodeList = [];
        const genres = ['country', 'rock', 'pop', 'rap'];
        function getYear() {
            return Math.floor(Math.random() * (2020 - 1950) + 1950);
        }

        for (let i = 0; i < 16; i++) {
            const node = new Node({
                container_id: containerID,
                metatype: metatypes[0].id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)],
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(node);
        }

        for (let i = 0; i < 3; i++) {
            const node = new Node({
                container_id: containerID,
                metatype: metatypes[1].id!,
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

        for (let i = 0; i < 50; i++) {
            const node = new Node({
                container_id: containerID,
                metatype: metatypes[2].id!,
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

        for (let i = 0; i < 6; i++) {
            const node = new Node({
                container_id: containerID,
                metatype: metatypes[3].id!,
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
        expect(nodeResults.isError, metatypeResults.error?.error).false;
        expect(nodeResults.value.length).eq(75);
        nodes = plainToClass(Node, nodeResults.value);

        const musicians = nodes.slice(0, 16);
        expect(musicians.length).eq(16);
        expect(musicians[0].metatype!.id).eq(metatypes[0].id);
        expect(musicians[15].metatype!.id).eq(metatypes[0].id);

        const bands = nodes.slice(16, 19);
        expect(bands.length).eq(3);
        expect(bands[0].metatype!.id).eq(metatypes[1].id);
        expect(bands[2].metatype!.id).eq(metatypes[1].id);

        songs = nodes.slice(19, 69);
        expect(songs.length).eq(50);
        expect(songs[0].metatype!.id).eq(metatypes[2].id);
        expect(songs[49].metatype!.id).eq(metatypes[2].id);

        const albums = nodes.slice(69, 75);
        expect(albums.length).eq(6);
        expect(albums[0].metatype!.id).eq(metatypes[3].id);
        expect(albums[5].metatype!.id).eq(metatypes[3].id);

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
        relationships = relResults.value;

        relationships.forEach(async (rel) => {
            const testKeys = [...test_rel_keys];
            testKeys.forEach((key) => (key.metatype_relationship_id = rel.id));
            const rKeys = await mrKeyMapper.BulkCreate('test suite', testKeys);
            expect(rKeys.isError).false;
        });

        const relPairList = [
            new MetatypeRelationshipPair({
                name: 'album includes song',
                origin_metatype: metatypes[3].id!,
                destination_metatype: metatypes[2].id!,
                relationship: relationships[0].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'musician member of band',
                origin_metatype: metatypes[0].id!,
                destination_metatype: metatypes[1].id!,
                relationship: relationships[1].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'musician writes song',
                origin_metatype: metatypes[0].id!,
                destination_metatype: metatypes[2].id!,
                relationship: relationships[2].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'musician writes album',
                origin_metatype: metatypes[0].id!,
                destination_metatype: metatypes[3].id!,
                relationship: relationships[2].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'band performs song',
                origin_metatype: metatypes[1].id!,
                destination_metatype: metatypes[2].id!,
                relationship: relationships[2].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'band performs album',
                origin_metatype: metatypes[1].id!,
                destination_metatype: metatypes[3].id!,
                relationship: relationships[2].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'song features musician',
                origin_metatype: metatypes[2].id!,
                destination_metatype: metatypes[0].id!,
                relationship: relationships[3].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
        ];

        const relPairs = await mrPairMapper.BulkCreate('test suite', relPairList);
        expect(relPairs.isError).false;
        expect(relPairs.value).not.empty;
        expect(relPairs.value.length).eq(7);
        const pairs = relPairs.value;

        const edgeList = [];

        // songs in albums
        for (let i = 0; i < 7; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[0].id!,
                properties: relPayload,
                origin_id: albums[0].id,
                destination_id: songs[i].id,
            });
            edgeList.push(edge);
        }

        for (let i = 0; i < 3; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[0].id!,
                properties: relPayload,
                origin_id: albums[1].id,
                destination_id: songs[i + 7].id,
            });
            edgeList.push(edge);
        }

        for (let i = 0; i < 4; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[0].id!,
                properties: relPayload,
                origin_id: albums[2].id,
                destination_id: songs[i + 10].id,
            });
            edgeList.push(edge);
        }

        for (let i = 0; i < 5; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[0].id!,
                properties: relPayload,
                origin_id: albums[3].id,
                destination_id: songs[i + 14].id,
            });
            edgeList.push(edge);
        }

        for (let i = 0; i < 3; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[0].id!,
                properties: relPayload,
                origin_id: albums[4].id,
                destination_id: songs[i + 19].id,
            });
            edgeList.push(edge);
        }
        const featAlb1 = edgeList.slice(19, 22);
        featAlb1.push(
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[0].id!,
                properties: relPayload,
                origin_id: albums[4].id,
                destination_id: songs[8].id,
            }),
        );
        expect(featAlb1.length).eq(4);
        expect(featAlb1[0].origin_id).eq(albums[4].id);
        expect(featAlb1[3].origin_id).eq(albums[4].id);

        for (let i = 0; i < 5; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[0].id!,
                properties: relPayload,
                origin_id: albums[5].id,
                destination_id: songs[i + 22].id,
            });
            edgeList.push(edge);
        }
        const featAlb2 = edgeList.slice(22, 27);
        expect(featAlb2.length).eq(5);
        expect(featAlb2[0].origin_id).eq(albums[5].id);
        expect(featAlb2[3].origin_id).eq(albums[5].id);

        // musicians in bands
        for (let i = 0; i < 4; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[1].id!,
                properties: relPayload,
                origin_id: musicians[i].id,
                destination_id: bands[0].id,
            });
            edgeList.push(edge);
        }

        for (let i = 0; i < 3; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[1].id!,
                properties: relPayload,
                origin_id: musicians[i + 4].id,
                destination_id: bands[1].id,
            });
            edgeList.push(edge);
        }

        for (let i = 0; i < 3; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[1].id!,
                properties: relPayload,
                origin_id: musicians[i + 7].id,
                destination_id: bands[2].id,
            });
            edgeList.push(edge);
        }

        edgeList.push(
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[1].id!,
                properties: relPayload,
                origin_id: musicians[10].id,
                destination_id: bands[2].id,
            }),
        );

        // musicians write songs
        for (let i = 0; i < 3; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[2].id!,
                properties: relPayload,
                origin_id: musicians[3].id,
                destination_id: songs[i + 27].id,
            });
            edgeList.push(edge);
        }

        for (let i = 0; i < 4; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[2].id!,
                properties: relPayload,
                origin_id: musicians[11].id,
                destination_id: songs[i + 30].id,
            });
            edgeList.push(edge);
        }

        for (let i = 0; i < 3; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[2].id!,
                properties: relPayload,
                origin_id: musicians[13].id,
                destination_id: songs[i + 34].id,
            });
            edgeList.push(edge);
        }

        for (let i = 0; i < 7; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[2].id!,
                properties: relPayload,
                origin_id: musicians[15].id,
                destination_id: songs[i + 37].id,
            });
            edgeList.push(edge);
        }

        for (let i = 0; i < 4; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[2].id!,
                properties: relPayload,
                origin_id: musicians[9].id,
                destination_id: songs[i + 44].id,
            });
            edgeList.push(edge);
        }

        // musicians write albums
        edgeList.push(
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[3].id!,
                properties: relPayload,
                origin_id: musicians[11].id,
                destination_id: albums[1].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[3].id!,
                properties: relPayload,
                origin_id: musicians[12].id,
                destination_id: albums[1].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[3].id!,
                properties: relPayload,
                origin_id: musicians[14].id,
                destination_id: albums[2].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[3].id!,
                properties: relPayload,
                origin_id: musicians[10].id,
                destination_id: albums[3].id,
            }),
        );

        // bands write songs
        for (let i = 0; i < 2; i++) {
            const edge = new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[4].id!,
                properties: relPayload,
                origin_id: bands[1].id,
                destination_id: songs[i + 48].id,
            });
            edgeList.push(edge);
        }

        // bands write albums
        edgeList.push(
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[5].id!,
                properties: relPayload,
                origin_id: bands[0].id,
                destination_id: albums[0].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[5].id!,
                properties: relPayload,
                origin_id: bands[1].id,
                destination_id: albums[4].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[5].id!,
                properties: relPayload,
                origin_id: bands[2].id,
                destination_id: albums[3].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[5].id!,
                properties: relPayload,
                origin_id: bands[2].id,
                destination_id: albums[5].id,
            }),
        );

        // songs feature musicians
        edgeList.push(
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[6].id!,
                properties: relPayload,
                origin_id: featAlb1[0].destination_id,
                destination_id: musicians[12].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[6].id!,
                properties: relPayload,
                origin_id: featAlb1[3].destination_id,
                destination_id: musicians[13].id,
            }),
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: pairs[6].id!,
                properties: relPayload,
                origin_id: featAlb2[0].destination_id,
                destination_id: musicians[0].id,
            }),
        );
        const edgeResults = await eMapper.BulkCreate('test suite', edgeList);
        expect(edgeResults.isError).false;
        expect(relPairs.value).not.empty;
        expect(edgeResults.value.length).eq(72);

        const schemaGenerator = new GraphQLRunner();

        const schemaResults = await schemaGenerator.ForContainer(containerID, {});
        expect(schemaResults.isError).false;
        expect(schemaResults.value).not.empty;
        schema = schemaResults.value;

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await DataSourceMapper.Instance.Delete(dataSourceID);
        await ContainerMapper.Instance.Delete(containerID);
        void PostgresAdapter.Instance.close();

        return Promise.resolve();
    });

    it('can query n layers deep given a root node', async () => {
        const response = await graphql({
            schema,
            source: `{
                graph(
                    root_node: "${songs[0].id}"
                    depth: "5"
                ){
                    depth
                    origin_id
                    origin_properties
                    origin_metatype_name
                    relationship_name
                    edge_properties
                    destination_id
                    destination_properties
                    destination_metatype_name
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.length).eq(17);

        for (const nL of data) {
            expect(nL.depth).not.undefined;
            expect(nL.depth).gt(0);
            expect(nL.depth).lte(5);
            expect(nL.origin_properties.name).not.undefined;
            expect(nL.edge_properties.color).eq('red');
            expect(nL.destination_properties.name).not.undefined;
            expect(nL.edge_data_source).undefined;
        }
    });

    it('can query n layers deep given an original node ID', async () => {
        const response = await graphql({
            schema,
            source: `{
                graph(
                    root_node: "${songs[0].original_data_id}"
                    depth: "5"
                    use_original_id: true
                ){
                    depth
                    origin_id
                    origin_properties
                    origin_metatype_name
                    relationship_name
                    edge_properties
                    destination_id
                    destination_properties
                    destination_metatype_name
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.length).eq(17);

        for (const nL of data) {
            expect(nL.depth).not.undefined;
            expect(nL.depth).gt(0);
            expect(nL.depth).lte(5);
            expect(nL.origin_properties.name).not.undefined;
            expect(nL.edge_properties.color).eq('red');
            expect(nL.destination_properties.name).not.undefined;
            expect(nL.edge_data_source).undefined;
        }
    });

    it('can save a query n layers deep given a root node to file', async () => {
        const schemaGenerator = new GraphQLRunner();

        const schemaResults = await schemaGenerator.ForContainer(containerID, {returnFile: true});
        expect(schemaResults.isError).false;
        expect(schemaResults.value).not.empty;

        const response = await graphql({
            schema: schemaResults.value,
            source: `{
                graph(
                    root_node: "${songs[0].id}"
                    depth: "5"
                ){
                        id
                        file_name
                        file_size
                        md5hash 
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.file_size).gt(0);

        return Promise.resolve();
    });

    it('can filter by metatype name', async () => {
        const response = await graphql({
            schema,
            source: `{
                graph(
                    root_node: "${songs[0].id}"
                    node_type: {name: "Musician"}
                    depth: "10"
                ){
                    depth
                    origin_id
                    origin_properties
                    origin_metatype_name
                    relationship_name
                    edge_properties
                    destination_id
                    destination_properties
                    destination_metatype_name
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.length).eq(17);

        for (const nL of data) {
            expect(nL.depth).not.undefined;
            expect(nL.depth).gt(0);
            expect(nL.depth).lte(10);
            expect(nL.origin_properties.name).not.undefined;
            expect(nL.edge_properties.color).eq('red');
            expect(nL.destination_properties.name).not.undefined;
            expect(nL.edge_data_source).undefined;
        }
    });

    it('can filter by metatype id', async () => {
        const response = await graphql({
            schema,
            source: `{
                graph(
                    root_node: "${songs[0].id}"
                    node_type: {id: "${metatypes[1].id}"}
                    depth: "10"
                ){
                    depth
                    origin_id
                    origin_properties
                    origin_metatype_name
                    relationship_name
                    edge_properties
                    destination_id
                    destination_properties
                    destination_metatype_name
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.length).eq(11);

        for (const nL of data) {
            expect(nL.depth).not.undefined;
            expect(nL.depth).gt(0);
            expect(nL.depth).lte(10);
            expect(nL.origin_properties.name).not.undefined;
            expect(nL.edge_properties.color).eq('red');
            expect(nL.destination_properties.name).not.undefined;
            expect(nL.edge_data_source).undefined;
        }
    });

    it('can filter by metatype uuid', async () => {
        const response = await graphql({
            schema,
            source: `{
                graph(
                    root_node: "${songs[0].id}"
                    node_type: {uuid: "${metatypes[1].uuid}"}
                    depth: "10"
                ){
                    depth
                    origin_id
                    origin_properties
                    origin_metatype_name
                    relationship_name
                    edge_properties
                    destination_id
                    destination_properties
                    destination_metatype_name
                    origin_metatype_uuid
                    destination_metatype_uuid
                    relationship_uuid
                    relationship_pair_uuid
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.length).eq(11);

        for (const nL of data) {
            expect(nL.depth).not.undefined;
            expect(nL.depth).gt(0);
            expect(nL.depth).lte(10);
            expect(nL.origin_properties.name).not.undefined;
            expect(nL.edge_properties.color).eq('red');
            expect(nL.destination_properties.name).not.undefined;
            expect(nL.edge_data_source).undefined;
            if (!(nL.origin_metatype_uuid === metatypes[1].uuid)) {
                expect(nL.destination_metatype_uuid).eq(metatypes[1].uuid);
            }
            expect(nL.relationship_uuid).not.undefined;
            expect(nL.relationship_pair_uuid).not.undefined;
        }
    });

    it('can filter by origin metatype', async () => {
        const response = await graphql({
            schema,
            source: `{
                graph(
                    root_node: "${songs[0].id}"
                    node_type: {origin_name: "Song"}
                    depth: "10"
                ){
                    depth
                    origin_id
                    origin_properties
                    origin_metatype_name
                    relationship_name
                    edge_properties
                    destination_id
                    destination_properties
                    destination_metatype_name
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.length).eq(2);

        for (const nL of data) {
            expect(nL.depth).not.undefined;
            expect(nL.depth).gt(0);
            expect(nL.depth).lte(10);
            expect(nL.origin_metatype_name).eq('Song');
            expect(nL.origin_properties.name).not.undefined;
            expect(nL.edge_properties.color).eq('red');
            expect(nL.destination_properties.name).not.undefined;
            expect(nL.edge_data_source).undefined;
        }
    });

    it('can filter by destination metatype', async () => {
        const response = await graphql({
            schema,
            source: `{
                graph(
                    root_node: "${songs[0].id}"
                    node_type: {destination_id: "${metatypes[3].id}"}
                    depth: "10"
                ){
                    depth
                    origin_id
                    origin_properties
                    origin_metatype_name
                    relationship_name
                    edge_properties
                    destination_id
                    destination_properties
                    destination_metatype_name
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.length).eq(3);

        for (const nL of data) {
            expect(nL.depth).not.undefined;
            expect(nL.depth).gt(0);
            expect(nL.depth).lte(10);
            expect(nL.origin_properties.name).not.undefined;
            expect(nL.edge_properties.color).eq('red');
            expect(nL.destination_properties.name).not.undefined;
            expect(nL.edge_data_source).undefined;
            expect(nL.destination_metatype_name).eq('Album');
        }
    });

    it('can filter by relationship name', async () => {
        const response = await graphql({
            schema,
            source: `{
                graph(
                    root_node: "${songs[0].id}"
                    edge_type: {name: "performs"}
                    depth: "10"
                ){
                    depth
                    origin_id
                    origin_properties
                    origin_metatype_name
                    relationship_name
                    edge_properties
                    destination_id
                    destination_properties
                    destination_metatype_name
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.length).eq(11);

        for (const nL of data) {
            expect(nL.depth).not.undefined;
            expect(nL.depth).gt(0);
            expect(nL.depth).lte(10);
            expect(nL.origin_properties.name).not.undefined;
            expect(nL.edge_properties.color).eq('red');
            expect(nL.relationship_name).eq('performs');
            expect(nL.destination_properties.name).not.undefined;
            expect(nL.edge_data_source).undefined;
        }
    });

    it('can filter by relationship id', async () => {
        const response = await graphql({
            schema,
            source: `{
                graph(
                    root_node: "${songs[0].id}"
                    edge_type: {id: "${relationships[1].id}"}
                    depth: "10"
                ){
                    depth
                    origin_id
                    origin_properties
                    origin_metatype_name
                    relationship_name
                    relationship_id
                    edge_properties
                    destination_id
                    destination_properties
                    destination_metatype_name
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.length).eq(8);

        for (const nL of data) {
            expect(nL.depth).not.undefined;
            expect(nL.depth).gt(0);
            expect(nL.depth).lte(10);
            expect(nL.origin_properties.name).not.undefined;
            expect(nL.edge_properties.color).eq('red');
            expect(nL.relationship_id).eq(relationships[1].id);
            expect(nL.destination_properties.name).not.undefined;
            expect(nL.edge_data_source).undefined;
        }
    });

    it('can filter by relationship uuid', async () => {
        const response = await graphql({
            schema,
            source: `{
                graph(
                    root_node: "${songs[0].id}"
                    edge_type: {uuid: "${relationships[1].uuid}"}
                    depth: "10"
                ){
                    depth
                    origin_id
                    origin_properties
                    origin_metatype_name
                    relationship_name
                    relationship_id
                    edge_properties
                    destination_id
                    destination_properties
                    destination_metatype_name
                    relationship_uuid
                    relationship_pair_uuid
                    origin_metatype_uuid
                    destination_metatype_uuid
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.length).eq(8);

        for (const nL of data) {
            expect(nL.depth).not.undefined;
            expect(nL.depth).gt(0);
            expect(nL.depth).lte(10);
            expect(nL.origin_properties.name).not.undefined;
            expect(nL.edge_properties.color).eq('red');
            expect(nL.relationship_id).eq(relationships[1].id);
            expect(nL.destination_properties.name).not.undefined;
            expect(nL.edge_data_source).undefined;
            expect(nL.relationship_uuid).eq(relationships[1].uuid);
            expect(nL.relationship_pair_uuid).not.undefined;
            expect(nL.origin_metatype_uuid).not.undefined;
            expect(nL.destination_metatype_uuid).not.undefined;
        }
    });

    it('can return metatype ids', async () => {
        await MetatypeRelationshipPairMapper.Instance.RefreshView();
        await MetatypeKeyMapper.Instance.RefreshView();

        const response = await graphql({
            schema,
            source: `{
                graph(
                    root_node: "${songs[0].id}"
                    depth: "5"
                ){
                    origin_metatype_id
                    origin_metatype_name
                    destination_metatype_id
                    destination_metatype_name
                }
            }`,
        });
        expect(response.errors).undefined;
        expect(response.data).not.undefined;
        const data = response.data!.graph;
        expect(data.length).eq(17);

        for (const nL of data) {
            expect(nL.origin_metatype_id).not.undefined;
            expect(nL.origin_metatype_id).to.be.oneOf(metatypeIDs);
            expect(nL.destination_metatype_id).not.undefined;
            expect(nL.destination_metatype_id).to.be.oneOf(metatypeIDs);
        }
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
        description: 'primary genre of song or artist',
        required: false,
        property_name: 'genre',
        data_type: 'enumeration',
        options: ['country', 'rock', 'pop', 'rap'],
    }),
    new MetatypeKey({
        name: 'Test Not Required 2',
        description: 'start of career or release of song',
        required: false,
        property_name: 'year',
        data_type: 'number',
    }),
];

const test_rel_keys: MetatypeRelationshipKey[] = [
    new MetatypeRelationshipKey({
        name: 'Test',
        description: 'inspiration for band name/song/album',
        required: true,
        property_name: 'inspiration',
        data_type: 'string',
    }),
    new MetatypeRelationshipKey({
        name: 'Test2',
        description: 'color scheme',
        required: true,
        property_name: 'color',
        data_type: 'enumeration',
        options: ['yellow', 'blue', 'red'],
    }),
    new MetatypeRelationshipKey({
        name: 'Test Not Required',
        description: 'not required',
        required: false,
        property_name: 'notRequired',
        data_type: 'number',
    }),
];

const relPayload: {[key: string]: any} = {
    inspiration: faker.name.findName(),
    color: 'red',
    notRequired: 12345,
};
