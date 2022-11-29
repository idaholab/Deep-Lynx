import Logger from '../../../services/logger';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import MetatypeKeyMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import MetatypeMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import faker from 'faker';
import { expect } from 'chai';
import NodeMapper from '../../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../../domain_objects/data_warehouse/ontology/metatype';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import MetatypeKey from '../../../domain_objects/data_warehouse/ontology/metatype_key';
import Node from '../../../domain_objects/data_warehouse/data/node';
import { User } from '../../../domain_objects/access_management/user';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import DataSourceRecord, { TimeseriesColumn, TimeseriesDataSourceConfig } from '../../../domain_objects/data_warehouse/import/data_source';
import MetatypeRelationshipMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRelationship from '../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipKey from '../../../domain_objects/data_warehouse/ontology/metatype_relationship_key';
import MetatypeRelationshipKeyMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_key_mapper';
import MetatypeRelationshipPair from '../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeRelationshipPairMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import EdgeMapper from '../../../data_access_layer/mappers/data_warehouse/data/edge_mapper';
import Edge from '../../../domain_objects/data_warehouse/data/edge';
import { plainToInstance } from 'class-transformer';
import MetatypeRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import MetatypeRelationshipRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_repository';
import NodeRepository from '../../../data_access_layer/repositories/data_warehouse/data/node_repository';
import EdgeRepository from '../../../data_access_layer/repositories/data_warehouse/data/edge_repository';
import MetatypeRelationshipPairRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import DataSourceRepository, { DataSourceFactory } from '../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import fs from 'fs';
import DataStagingRepository from '../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';

describe('The updated repository layer', async () => {
    let containerID: string;
    let user: User;
    let dataSourceID: string;
    let timeSourceID: string;
    let nodes: Node[] = [];
    let songs: Node[] = [];
    let metatypes: Metatype[] = [];
    let relationships: MetatypeRelationship[] = [];
    const genres: string[] = ['country', 'opera', 'jazz', 'rap', 'rock', 'showtunes', 'pop', 'EDM'];

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping repository tsts, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();

        const container = await ContainerMapper.Instance.Create(
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
        const mrKeyMapper = MetatypeRelationshipKeyMapper.Instance;
        const mrPairMapper = MetatypeRelationshipPairMapper.Instance;
        const eMapper = EdgeMapper.Instance;

        const metatypeResults = await mMapper.BulkCreate(user.id!, [
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
            const keys = await mkMapper.BulkCreate(user.id!, testKeys);
            expect(keys.isError).false;
        });

        const nodeList = [];

        function getYear(startYear?: number, endYear?: number) {
            let start = startYear ? startYear : 1950
            let end = endYear ? endYear : 2020
            return Math.floor(Math.random() * (end - start) + start);
        }

        for (let i = 0; i < 16; i++) {
            const node = new Node({
                container_id: containerID,
                metatype: metatypes[0].id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)]
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
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(node);
        }

        for (let i = 0; i < 6; i++) {
            const oldGoodOnDemand = new Node({
                container_id: containerID,
                metatype: metatypes[2].id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)],
                    year: getYear(1950, 1985),
                    isGoodSong: true,
                    availability: 'OnDemand'
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(oldGoodOnDemand);

            const oldGoodSongRadio = new Node({
                container_id: containerID,
                metatype: metatypes[2].id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)],
                    year: getYear(1950, 1985),
                    isGoodSong: true,
                    availability: 'SongRadio'
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(oldGoodSongRadio);

            const oldBadOnDemand = new Node({
                container_id: containerID,
                metatype: metatypes[2].id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)],
                    year: getYear(1950, 1985),
                    isGoodSong: false,
                    availability: 'OnDemand'
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(oldBadOnDemand);

            const oldBadSongRadio = new Node({
                container_id: containerID,
                metatype: metatypes[2].id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)],
                    year: getYear(1950, 1985),
                    isGoodSong: false,
                    availability: 'SongRadio'
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(oldBadSongRadio);

            const newGoodOnDemand = new Node({
                container_id: containerID,
                metatype: metatypes[2].id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)],
                    year: getYear(1986, 2020),
                    isGoodSong: true,
                    availability: 'OnDemand'
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(newGoodOnDemand);

            const newGoodSongRadio = new Node({
                container_id: containerID,
                metatype: metatypes[2].id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)],
                    year: getYear(1986, 2020),
                    isGoodSong: true,
                    availability: 'SongRadio'
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(newGoodSongRadio);

            const newBadOnDemand = new Node({
                container_id: containerID,
                metatype: metatypes[2].id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)],
                    year: getYear(1986, 2020),
                    isGoodSong: false,
                    availability: 'OnDemand'
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(newBadOnDemand);
        }

        for (let i = 0; i < 8; i++) {
            const newBadSongRadio = new Node({
                container_id: containerID,
                metatype: metatypes[2].id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)],
                    year: getYear(1986, 2020),
                    isGoodSong: false,
                    availability: 'SongRadio'
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(newBadSongRadio);
        }

        for (let i = 0; i < 6; i++) {
            const node = new Node({
                container_id: containerID,
                metatype: metatypes[3].id!,
                properties: {
                    name: faker.name.findName(),
                    genre: genres[Math.floor(Math.random() * genres.length)],
                },
                data_source_id: dataSourceID,
                original_data_id: faker.name.findName(),
            });
            nodeList.push(node);
        }

        const nodeResults = await nMapper.BulkCreateOrUpdateByCompositeID(user.id!, nodeList);
        expect(nodeResults.isError, metatypeResults.error?.error).false;
        expect(nodeResults.value.length).eq(75);
        nodes = plainToInstance(Node, nodeResults.value);

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

        const relResults = await mrMapper.BulkCreate(user.id!, relList);
        expect(relResults.isError).false;
        expect(relResults.value).not.empty;
        expect(relResults.value.length).eq(4);
        relationships = relResults.value;

        relationships.forEach(async (rel) => {
            const testKeys = [...test_rel_keys];
            testKeys.forEach((key) => (key.metatype_relationship_id = rel.id));
            const rKeys = await mrKeyMapper.BulkCreate(user.id!, testKeys);
            expect(rKeys.isError).false;
        });

        const relPairList = [
            new MetatypeRelationshipPair({
                name: 'album includes song',
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes[3].id!,
                destination_metatype: metatypes[2].id!,
                relationship: relationships[0].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'musician member of band',
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes[0].id!,
                destination_metatype: metatypes[1].id!,
                relationship: relationships[1].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'musician writes song',
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes[0].id!,
                destination_metatype: metatypes[2].id!,
                relationship: relationships[2].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'musician writes album',
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes[0].id!,
                destination_metatype: metatypes[3].id!,
                relationship: relationships[2].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'band performs song',
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes[1].id!,
                destination_metatype: metatypes[2].id!,
                relationship: relationships[2].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'band performs album',
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes[1].id!,
                destination_metatype: metatypes[3].id!,
                relationship: relationships[2].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
            new MetatypeRelationshipPair({
                name: 'song features musician',
                description: faker.random.alphaNumeric(),
                origin_metatype: metatypes[2].id!,
                destination_metatype: metatypes[0].id!,
                relationship: relationships[3].id!,
                relationship_type: 'many:many',
                container_id: containerID,
            }),
        ];

        const relPairs = await mrPairMapper.BulkCreate(user.id!, relPairList);
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
        const edgeResults = await eMapper.BulkCreate(user.id!, edgeList);
        expect(edgeResults.isError).false;
        expect(relPairs.value).not.empty;
        expect(edgeResults.value.length).eq(72);

        // setup for timeseries query

        const sourceRepo = new DataSourceRepository();

        let source = new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source Timeseries GraphQL',
                active: false,
                adapter_type: 'timeseries',
                config: new TimeseriesDataSourceConfig({
                    columns: [
                        {
                            column_name: 'primary_timestamp',
                            property_name: 'Timestamp',
                            is_primary_timestamp: true,
                            type: 'date',
                            date_conversion_format_string: 'YYYY-MM-DD HH:MI:SS',
                        },
                        {
                            column_name: 'temperature',
                            property_name: 'Temperature (K)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                        {
                            column_name: 'velocity_i',
                            property_name: 'Velocity[i] (m/s)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                        {
                            column_name: 'velocity_j',
                            property_name: 'Velocity[j] (m/s)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                        {
                            column_name: 'x',
                            property_name: 'X (m)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                        {
                            column_name: 'y',
                            property_name: 'Y (m)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                        {
                            column_name: 'z',
                            property_name: 'Z (m)',
                            is_primary_timestamp: false,
                            type: 'number',
                        },
                    ] as TimeseriesColumn[],
                }),
            }),
        );

        let results = await sourceRepo.save(source!, user);
        expect(results.isError, results.error?.error).false;
        expect(source!.DataSourceRecord?.id).not.undefined;
        timeSourceID = source!.DataSourceRecord!.id!;

        // write the json test data out to a temporary file
        fs.writeFileSync('./test-timeseries-datasource-graphql.json', sampleJSON);

        // now we create an import through the datasource
        let received = await source!.ReceiveData(fs.createReadStream('./test-timeseries-datasource-graphql.json'), user);
        expect(received.isError, received.error?.error).false;

        return Promise.resolve();
    });

    after(async function () {
        await DataSourceMapper.Instance.Delete(dataSourceID);
        await DataSourceMapper.Instance.DeleteWithData(timeSourceID);
        await ContainerMapper.Instance.Delete(containerID);
        await UserMapper.Instance.Delete(user.id!);
        void PostgresAdapter.Instance.close();

        return Promise.resolve();
    });

    it('can execute a basic query', async () => {
        const mtRepo = new MetatypeRepository();

        let query = mtRepo.where().containerID('eq', containerID);
        expect(query._query.WHERE).not.undefined;
        let qualifier = query._query.WHERE![1].split('.')[0];
        expect(qualifier).eq(mtRepo._tableAlias);

        let results = await query.list();
        expect(results.isError).false;
        expect(results.value.length).eq(4);

        return Promise.resolve();
    });

    it('can execute a chained query', async () => {
        const mrRepo = new MetatypeRelationshipRepository();

        let query = mrRepo
            .where()
            .containerID('eq', containerID)
            .and()
            .description('like', '%musician%');
        expect(query._query.WHERE).not.undefined;
        let queryPart1 = query._query.WHERE![1].split('.')[0];
        let queryPart2 = query._query.WHERE![3].split('.')[0];
        expect(queryPart1).eq(mrRepo._tableAlias);
        expect(queryPart2).eq(mrRepo._tableAlias);

        let results = await query.list()
        expect(results.isError).false;
        expect(results.value.length).eq(3);
        results.value.forEach((rel) => {
            expect(rel.description).not.null;
            expect(rel.description).contains('musician');
        });

        return Promise.resolve();
    });

    it('can query and save results to file', async () => {
        const nodeRepo = new NodeRepository();

        // json format
        let saveToJson = await nodeRepo
            .where()
            .containerID('eq', containerID)
            .listAllToFile({containerID: containerID, file_type: 'json'});
        expect(saveToJson.isError).false;
        expect(saveToJson.value.file_size).gt(0);

        // csv format
        let saveToCSV = await nodeRepo
            .where()
            .containerID('eq', containerID)
            .listAllToFile({containerID: containerID, file_type: 'csv'});
        expect(saveToCSV.isError).false;
        expect(saveToCSV.value.file_size).gt(0);

        // parquet format
        let saveToParquet = await nodeRepo
            .where()
            .containerID('eq', containerID)
            .listAllToFile({containerID: containerID, file_type: 'parquet'});
        expect(saveToParquet.isError).false;
        expect(saveToParquet.value.file_size).gt(0);

        return Promise.resolve();
    });

    it('can execute nested queries', async () => {
        const nodeRepo = new NodeRepository();

        let alias = new RegExp(nodeRepo._tableAlias, 'g');

        // checking and/or binaries using
        // A: song is older than 1986
        // B: song is good
        // C: song is available on demand

        // A and B and C
        const andAndQuery = nodeRepo.where()
            .containerID('eq', containerID)
            .and().metatypeName('eq', 'Song')
            .and(new NodeRepository()
                .property('year', '<', 1986)
                .and(new NodeRepository()
                    .property('isGoodSong', 'eq', 'true')
                    .and()
                    .property('availability', 'eq', 'OnDemand')
                )
            );
        expect(andAndQuery._query.WHERE).not.undefined;
        let query = andAndQuery._query.WHERE?.join(' ');
        expect(query?.match(alias || [])?.length).eq(5);

        const andAndResults = await andAndQuery.list();
        expect(andAndResults.isError).false;
        expect(andAndResults.value.length).eq(6);
        andAndResults.value.forEach((node) => {
            const song = node.properties
            expect(song['year' as keyof object]).lessThan(1986);
            expect(song['isGoodSong' as keyof object]).true;
            expect(song['availability' as keyof object]).eq('OnDemand');
        });

        // A and (B or C)
        const andOrQuery = nodeRepo.where()
            .containerID('eq', containerID)
            .and().metatypeName('eq', 'Song')
            .and(new NodeRepository()
                .property('year', '<', 1986)
                .and(new NodeRepository()
                    .property('isGoodSong', 'eq', 'true')
                    .or()
                    .property('availability', 'eq', 'OnDemand')
                )
            );
        expect(andOrQuery._query.WHERE).not.undefined;
        query = andOrQuery._query.WHERE?.join(' ');
        expect(query?.match(alias || [])?.length).eq(5);

        const andOrResults = await andOrQuery.list();
        expect(andOrResults.isError).false;
        expect(andOrResults.value.length).eq(18);
        andOrResults.value.forEach((node) => {
            const song = node.properties
            expect(song['year' as keyof object]).lessThan(1986);
            // if property B is not true, property C must be
            if (song['isGoodSong' as keyof object] === 'false'){
                expect(song['availability' as keyof object]).eq('OnDemand');
            }
        });

        // A or (B and C)
        const orAndQuery = nodeRepo.where()
            .containerID('eq', containerID)
            .and().metatypeName('eq', 'Song')
            .and(new NodeRepository()
                .property('year', '<', 1986)
                .or(new NodeRepository()
                    .property('isGoodSong', 'eq', 'true')
                    .and()
                    .property('availability', 'eq', 'OnDemand')
                )
            );
        expect(orAndQuery._query.WHERE).not.undefined;
        query = orAndQuery._query.WHERE?.join(' ');
        expect(query?.match(alias || [])?.length).eq(5);

        const orAndResults = await orAndQuery.list();
        expect(orAndResults.isError).false;
        expect(orAndResults.value.length).eq(30);
        orAndResults.value.forEach((node) => {
            const song = node.properties
            // if A is not true, both B and C must be
            if (song['year' as keyof object] > 1985){
                expect(song['isGoodSong' as keyof object]).true;
                expect(song['availability' as keyof object]).eq('OnDemand');
            }
        });

        // A or (B or C)
        const orOrQuery = nodeRepo.where()
            .containerID('eq', containerID)
            .and().metatypeName('eq', 'Song')
            .and(new NodeRepository()
                .property('year', '<', 1986)
                .or(new NodeRepository()
                    .property('isGoodSong', 'eq', 'true')
                    .or()
                    .property('availability', 'eq', 'OnDemand')
                )
            );
        expect(orOrQuery._query.WHERE).not.undefined;
        query = orOrQuery._query.WHERE?.join(' ');
        expect(query?.match(alias || [])?.length).eq(5);

        const orOrResults = await orOrQuery.list();
        expect(orOrResults.isError).false;
        expect(orOrResults.value.length).eq(42);
        orOrResults.value.forEach((node) => {
            const song = node.properties
            // if A and B are not true, C must be
            if (song['year' as keyof object] > 1985 && song['isGoodSong' as keyof object] === false){
                expect(song['availability' as keyof object]).eq('OnDemand');
            }
        });

        return Promise.resolve();
    });

    it('can execute nested queries without removing prior or latter logic', async () => {
        const nodeRepo = new NodeRepository();
        const alias = new RegExp(nodeRepo._tableAlias, 'g');

        // A - song after 1985
        // B - song is not good
        // C - song available on radio

        // WHERE (A or (B or C)) AND containerID = id AND metatype = song
        let query = nodeRepo
            .where(new NodeRepository()
                .property('year', '>', 1985)
                .or(new NodeRepository()
                    .property('isGoodSong', 'eq', 'false')
                    .or()
                    .property('availability', 'eq', 'SongRadio')
                )
            )
            .and().containerID('eq', containerID)
            .and().metatypeName('eq', 'Song');
        expect(query._query.WHERE).not.undefined;
        let queryString = query._query.WHERE?.join(' ');
        expect(queryString?.match(alias || [])?.length).eq(5);
        
        let results = await query.list();
        expect(results.isError).false;
        expect(results.value.length).eq(44);
        results.value.forEach((node) => {
            const song = node.properties
            // if A and B are not true, C must be
            if (song['year' as keyof object] < 1986 && song['isGoodSong' as keyof object] === true){
                expect(song['availability' as keyof object]).eq('SongRadio');
            }
            expect(node.container_id).eq(containerID);
            expect(node.metatype_name).eq('Song');
        });

        // WHERE containerID = id AND (A or (B or C)) AND metatype = song
        query = nodeRepo
            .where()
            .containerID('eq', containerID)
            .and(new NodeRepository()
                .property('year', '>', 1985)
                .or(new NodeRepository()
                    .property('isGoodSong', 'eq', 'false')
                    .or()
                    .property('availability', 'eq', 'SongRadio')
                )
            )
            .and().metatypeName('eq', 'Song');
        expect(query._query.WHERE).not.undefined;
        queryString = query._query.WHERE?.join(' ');
        expect(queryString?.match(alias || [])?.length).eq(5);
        
        results = await query.list();
        expect(results.isError).false;
        expect(results.value.length).eq(44);
        results.value.forEach((node) => {
            const song = node.properties
            // if A and B are not true, C must be
            if (song['year' as keyof object] < 1986 && song['isGoodSong' as keyof object] === true){
                expect(song['availability' as keyof object]).eq('SongRadio');
            }
            expect(node.container_id).eq(containerID);
            expect(node.metatype_name).eq('Song');
        });

        // WHERE containerID = id AND metatype = song AND (A or (B or C)) 
        query = nodeRepo
            .where()
            .containerID('eq', containerID)
            .and().metatypeName('eq', 'Song')
            .and(new NodeRepository()
                .property('year', '>', 1985)
                .or(new NodeRepository()
                    .property('isGoodSong', 'eq', 'false')
                    .or()
                    .property('availability', 'eq', 'SongRadio')
                )
            );
        expect(query._query.WHERE).not.undefined;
        queryString = query._query.WHERE?.join(' ');
        expect(queryString?.match(alias || [])?.length).eq(5);
        
        results = await query.list();
        expect(results.isError).false;
        expect(results.value.length).eq(44);
        results.value.forEach((node) => {
            const song = node.properties
            // if A and B are not true, C must be
            if (song['year' as keyof object] < 1986 && song['isGoodSong' as keyof object] === true){
                expect(song['availability' as keyof object]).eq('SongRadio');
            }
            expect(node.container_id).eq(containerID);
            expect(node.metatype_name).eq('Song');
        });

        return Promise.resolve();
    });

    it('can execute a query with joins', async () => {
        const nodeRepo = new NodeRepository();
        const edgeRepo = new EdgeRepository();
        const nodeRepo2 = new NodeRepository();

        // this join doesn't really make sense but it tests all the join options
        const query = nodeRepo.where().containerID('eq', containerID)
            .join(edgeRepo._tableName, {
                origin_col: 'id',
                destination_col: 'origin_id',
                join_type: 'INNER'
            })
            .join(nodeRepo2._tableName, {
                origin_col: 'destination_id',
                destination_col: 'id',
                operator: '<>',
                destination_alias: 'dest'
            }, edgeRepo._tableName)
        expect(query._query.JOINS).not.undefined;
        let check = new RegExp(`INNER JOIN ${edgeRepo._tableName} .* ON .*id = .*origin_id`);
        expect(query._query.JOINS![0]).match(check);
        check = new RegExp(`LEFT JOIN ${nodeRepo2._tableName} dest ON .*destination_id <> .*id`);
        expect(query._query.JOINS![1]).match(check);

        const results = await query.list();
        expect(results.isError).false;
        return Promise.resolve();
    });

    it('can add fields to the SELECT statement', async () => {
        const nodeRepo = new NodeRepository();
        const edgeRepo = new EdgeRepository();

        // test all three type options for addFields
        const query = nodeRepo.where().containerID('eq', containerID)
            .join(edgeRepo._tableName, {
                origin_col: 'id',
                destination_col: 'origin_id',
                join_type: 'INNER'
            })
            .addFields({'id': 'edge_id', 'properties': 'edge_properties'}, edgeRepo._tableName)
            .addFields('metatype_relationship_name', edgeRepo._tableName)
            .addFields(['origin_id', 'destination_id'], edgeRepo._tableName);
        expect(query._query.JOINS).not.undefined;
        const edgeAlias = nodeRepo._aliasMap.get(edgeRepo._tableName);
        expect(query._query.SELECT).includes(`, ${edgeAlias}.id AS edge_id`);
        expect(query._query.SELECT).includes(`, ${edgeAlias}.properties AS edge_properties`);
        expect(query._query.SELECT).includes(`, ${edgeAlias}.metatype_relationship_name`);
        expect(query._query.SELECT).includes(`, ${edgeAlias}.origin_id`);
        expect(query._query.SELECT).includes(`, ${edgeAlias}.destination_id`);

        const results = await query.list();
        expect(results.isError).false;
        results.value.forEach((result) => {
            expect(result['edge_id' as keyof object]).not.undefined;
            expect(result['edge_properties' as keyof object]).not.undefined;
            expect(result['metatype_relationship_name' as keyof object]).not.undefined;
            expect(result['origin_id' as keyof object]).not.undefined;
            expect(result['destination_id' as keyof object]).not.undefined;
        });
        
        return Promise.resolve();
    });

    it('can add query conditions with joins', async () => {
        const nodeRepo = new NodeRepository();
        const edgeRepo = new EdgeRepository();

        const edges = await edgeRepo.where().containerID('eq', containerID).list();
        expect(edges.isError).false;
        const test_edge_ids: string[] = [];
        edges.value.slice(0,9).forEach((edge) => {test_edge_ids.push(edge.id!)});

        const query = nodeRepo.where().containerID('eq', containerID)
            .join(edgeRepo._tableName, {
                origin_col: 'id',
                destination_col: 'origin_id',
                join_type: 'INNER'
            })
            .addFields({'id': 'edge_id', 'properties': 'edge_properties'}, edgeRepo._tableName)
            .where()
            .containerID('eq', containerID)
            .and()
            .property('genre', 'in', genres)
            .and()
            .query('id', 'in', test_edge_ids, {tableName: edgeRepo._tableName});
        expect(query._query.JOINS).not.undefined;
        const edgeAlias = nodeRepo._aliasMap.get(edgeRepo._tableName);
        const nodeAlias = nodeRepo._tableAlias;
        const where = query._query.WHERE;
        expect(query._query.SELECT).includes(`, ${edgeAlias}.id AS edge_id`);
        expect(query._query.SELECT).includes(`, ${edgeAlias}.properties AS edge_properties`);
        expect(where).includes(`${nodeAlias}.container_id = '${containerID}'`);
        expect(where![3]).contains(`${nodeAlias}.properties`);
        expect(where![6]).contains(`${edgeAlias}.id`);
        
        const results = await query.list();
        expect(results.isError).false;
        expect(results.value.length).lessThan(10);
        results.value.forEach((node) => {
            expect(node.properties['genre' as keyof object]).oneOf(genres);
            expect(node['edge_id' as keyof object]).oneOf(test_edge_ids);
            expect(node.container_id).eq(containerID);
        })

        return Promise.resolve();
    });

    it('does not rename qualified columns', async () => {
        // metatype relationship repository fully qualifies all its columns
        const repo = new MetatypeRelationshipPairRepository();

        const query = repo
            .where().containerID('eq', containerID)
            .and().name('like', '%performs%')
            .and().query('destination.name', 'eq', 'Song');
        const where = query._query.WHERE;
        expect(where![3]).contains('metatype_relationship_pairs.name');
        expect(where![5]).contains('destination.name');

        const results = await query.list();
        expect(results.isError).false;
        expect(results.value.length).eq(1);
        expect(results.value[0].name).eq('band performs song');
        expect(results.value[0].relationship_type).eq('many:many');

        return Promise.resolve();
    });

    it('can perform a count query with group by', async () => {
        const nodeRepo = new NodeRepository();
        const edgeRepo = new EdgeRepository();

        const query = nodeRepo.where().containerID('eq', containerID)
            .join(edgeRepo._tableName, {
                origin_col: 'id',
                destination_col: 'origin_id',
                join_type: 'INNER'
            })
            .addFields({"properties #>> '{genre}'": 'genre'})
            .where()
            .containerID('eq', containerID)
            .and()
            .property('genre', 'in', genres);
        // hijack the query to use count * (count only returns one row, we're expecting 4)
        query._query.SELECT[0] = 'SELECT COUNT(*)';
        const results = await query.list(false, {groupBy: `properties #>> '{genre}'`});
        expect(results.isError).false;
        let totalCount = 0;
        results.value.forEach((result) => {
            totalCount += parseInt(result['count' as keyof object]);
            expect(parseInt(result['count' as keyof object])).lessThan(73);
            expect(result['genre' as keyof object]).oneOf(genres);
        });
        expect(totalCount).eq(72);

        return Promise.resolve();
    });

    it('can group by in various formats', async () => {
        const nodeRepo = new NodeRepository();

        const results = await nodeRepo
            .join('edges', {origin_col: 'id', destination_col: 'origin_id', destination_alias: 'outgoing'})
            .addFields({'COUNT(outgoing.id)': 'outgoing_edge_count'})
            .groupBy('id') // testing singular field
            .groupBy(`${nodeRepo._tableAlias}.container_id`) // testing qualified field
            .groupBy('metatype_id', nodeRepo._tableAlias) // testing field with table alias
            .groupBy('properties', 'current_nodes') // testing table alias retrieval
            .groupBy(['data_source_id', 'import_data_id', 'data_staging_id']) // testing list
            .groupBy(['type_mapping_transformation_id', 'original_data_id'], nodeRepo._tableAlias) // testing list with alias
            .groupBy(['metadata', 'created_at', 'modified_at', 'deleted_at'], 'current_nodes') // testing list with alias retrieval
            .list(false, {
                groupBy: 'created_by,modified_by,metatype_name,metatype_uuid', // testing queryOption in list function
                sortBy: 'outgoing_edge_count', sortDesc: true, limit: 5}) // sort by highest count first
        expect(results.isError).false;
        expect(results.value.length).eq(5);
        // verify a few edge counts
        expect(results.value[0]['outgoing_edge_count' as keyof object]).eq('48');
        expect(results.value[4]['outgoing_edge_count' as keyof object]).eq('24');

        return Promise.resolve();
    })

    it('supports timeseries queries', async () => {
        const repo = new DataSourceRepository();
        // const config = source.DataSourceRecord.config as TimeseriesDataSourceConfig;

        const query = repo.where()
            .query('temperature', '>', 250, {
                dataType: 'integer',
                tableName: `y_${timeSourceID}`
            });
        expect(query._query.WHERE![1]).contains(`temperature::text > '250'::text`);

        const results = await query.listTimeseries(timeSourceID);
        expect(results.value.length).eq(6);
        results.value.forEach((entry) => {
            expect(entry.temperature).greaterThan(250);
            expect(entry.z).eq(0);
        })
        
        return Promise.resolve();
    });

    it('deduplicates repeated joins without a new alias', async () => {
        const nodeRepo = new NodeRepository();
        const stagingRepo = new DataStagingRepository();
        const edgeRepo = new EdgeRepository();

        // first join
        let query = nodeRepo.where().containerID('eq', containerID)
            .join(stagingRepo._tableName, {
                origin_col: 'data_staging_id',
                destination_col: 'id',
            })
            .addFields('data', stagingRepo._tableName)
        expect(query._query.JOINS).not.undefined;
        let check = new RegExp(`.* JOIN ${stagingRepo._tableName} .* ON .*data_staging_id = .*id`);
        expect(query._query.JOINS?.length).eq(1);
        expect(query._query.JOINS![0]).match(check);

        // second join (duplicate)
        query = query
            .join(stagingRepo._tableName, {
                origin_col: 'data_staging_id',
                destination_col: 'id',
            });
        // this second (duplicate) join shouldn't have been added
        expect(query._query.JOINS?.length).eq(1);

        // testing a non-duplicate join
        query = query
            .join(edgeRepo._tableName, {
                origin_col: 'id',
                destination_col: 'origin_id',
            });
        // this join should have been added as it isn't a duplicate
        expect(query._query.JOINS?.length).eq(2);
        // ensure that the join added was the right one
        check = new RegExp(`.* JOIN ${edgeRepo._tableName} .* ON .*id = .*origin_id`);
        expect(query._query.JOINS![1]).match(check);

        // testing a duplicate join with an alternate alias
        query = query
            .join(stagingRepo._tableName, {
                origin_col: 'data_staging_id',
                destination_col: 'id',
                destination_alias: 'new_alias'
            });
        // this join should have been added as it has a unique alias
        expect(query._query.JOINS?.length).eq(3);
        // ensure that the join added was the right one
        check = new RegExp(`.* JOIN ${stagingRepo._tableName} new_alias ON .*data_staging_id = new_alias.id`);
        expect(query._query.JOINS![2]).match(check);

        const results = await query.list();
        expect(results.isError).false;
        return Promise.resolve();
    })
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

const sampleJSON = JSON.stringify([
    {
        Timestamp: '2022-07-18 02:32:27.877058',
        'Temperature (K)': 230,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 2,
        'Y (m)': 7,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.877059',
        'Temperature (K)': 236,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 4,
        'Y (m)': 2,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.817059',
        'Temperature (K)': 271,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 8,
        'Y (m)': 4,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.812059',
        'Temperature (K)': 280,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 3,
        'Y (m)': 2,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.312059',
        'Temperature (K)': 299,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 8,
        'Y (m)': 8,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.412059',
        'Temperature (K)': 344,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 7,
        'Y (m)': 9,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.612059',
        'Temperature (K)': 245,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 6,
        'Y (m)': 0,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.512059',
        'Temperature (K)': 260,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 1,
        'Y (m)': 6,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.522059',
        'Temperature (K)': 291,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 0,
        'Y (m)': 1,
        'Z (m)': 0,
    },
    {
        Timestamp: '2022-07-18 02:32:27.532059',
        'Temperature (K)': 235,
        'Velocity[i] (m/s)': null,
        'Velocity[j] (m/s)': null,
        'X (m)': 5,
        'Y (m)': 3,
        'Z (m)': 0,
    },
]);