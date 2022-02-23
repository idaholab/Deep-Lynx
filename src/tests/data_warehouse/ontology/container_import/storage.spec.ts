import faker from 'faker';
import {expect} from 'chai';
import 'reflect-metadata';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import ContainerImport from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_import';
import fs from 'fs';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import NodeMapper from '../../../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import EdgeMapper from '../../../../data_access_layer/mappers/data_warehouse/data/edge_mapper';
import MetatypeRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import MetatypeRelationshipPairRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import {User} from '../../../../domain_objects/access_management/user';
import Node from '../../../../domain_objects/data_warehouse/data/node';
import ContainerRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/container_respository';
import Edge from '../../../../domain_objects/data_warehouse/data/edge';

describe('A Container Import', async () => {
    let user: User;
    const containerRepo = new ContainerRepository();

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping container import tests, no storage layer');
            this.skip();
        }
        await PostgresAdapter.Instance.init();

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

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        return PostgresAdapter.Instance.close();
    });

    it('can create a container from a valid ontology file', async () => {
        const containerImport = ContainerImport.Instance;
        const storage = ContainerMapper.Instance;

        const fileBuffer = await fs.readFileSync(`${__dirname}/test.owl`);

        const container = await containerImport.ImportOntology(
            user,
            {
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                data_versioning_enabled: false,
                ontology_versioning_enabled: false,
            },
            fileBuffer,
            false,
            false,
            '',
        );

        expect(container.isError, `container creation from ontology failed: ${container.error}`).false;
        expect(container.value).not.empty;

        return storage.Delete(container.value);
    });

    it('can update a container with a valid ontology file', async () => {
        const containerImport = ContainerImport.Instance;
        const storage = ContainerMapper.Instance;

        const containerInput = {
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            data_versioning_enabled: false,
            ontology_versioning_enabled: false,
        };
        let containerID: string;

        const original = fs.readFileSync(`${__dirname}/test.owl`);

        let container = await containerImport.ImportOntology(user, containerInput, original, false, false, '');

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value;

        const updated = fs.readFileSync(`${__dirname}/test_update.owl`);

        container = await containerImport.ImportOntology(user, containerInput, updated, false, true, containerID);

        expect(container.isError).false;
        expect(container.value).not.empty;

        return storage.Delete(container.value);
    });

    it('can prevent container update when a metatype to be removed has associated data', async () => {
        // using the Document class/metatype
        const containerImport = ContainerImport.Instance;
        const storage = ContainerMapper.Instance;
        const metatypeRepository = new MetatypeRepository();
        const nodeStorage = NodeMapper.Instance;

        const containerInput = {
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            data_versioning_enabled: false,
            ontology_versioning_enabled: false,
        };
        let containerID: string;

        const original = fs.readFileSync(`${__dirname}/test.owl`);
        let container = await containerImport.ImportOntology(user, containerInput, original, false, false, '');

        expect(container.isError).false;
        expect(container.value).not.empty;

        // retrieve container so we get the graph itself
        const retrievedContainer = await containerRepo.findByID(container.value);
        expect(retrievedContainer.isError).false;
        containerID = retrievedContainer.value.id!;

        const metatype = await metatypeRepository.where().containerID('eq', containerID).and().name('eq', 'Document').list(false);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const metatypeID = metatype.value[0].id;
        const nodeCreate = await nodeStorage.CreateOrUpdateByCompositeID(
            'test suite',
            new Node({
                container_id: containerID,
                metatype: metatypeID!,
                properties: {name: 'test document'},
            }),
        );

        expect(nodeCreate.isError).false;

        const updated = fs.readFileSync(`${__dirname}/test_metatype_removal_err.owl`);
        container = await containerImport.ImportOntology(user, containerInput, updated, false, true, containerID);

        expect(container.isError).true;

        await storage.Delete(containerID);
        return storage.Delete(container.value);
    });

    it('can prevent container update when a metatype key to be removed is for a metatype with associated data', async () => {
        // using the Document class/metatype
        const containerImport = ContainerImport.Instance;
        const storage = ContainerMapper.Instance;
        const metatypeRepository = new MetatypeRepository();
        const nodeStorage = NodeMapper.Instance;

        const containerInput = {
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            data_versioning_enabled: false,
            ontology_versioning_enabled: false,
        };
        let containerID: string;

        const original = fs.readFileSync(`${__dirname}/test.owl`);
        let container = await containerImport.ImportOntology(user, containerInput, original, false, false, '');

        expect(container.isError).false;
        expect(container.value).not.empty;

        // retrieve container so we get the graph itself
        const retrievedContainer = await containerRepo.findByID(container.value);
        expect(retrievedContainer.isError).false;
        containerID = retrievedContainer.value.id!;

        const metatype = await metatypeRepository.where().containerID('eq', containerID).and().name('eq', 'Document').list(false);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const metatypeID = metatype.value[0].id;
        const nodeCreate = await nodeStorage.CreateOrUpdateByCompositeID(
            'test suite',
            new Node({
                container_id: containerID,
                metatype: metatypeID!,
                properties: {name: 'test document'},
            }),
        );

        expect(nodeCreate.isError).false;

        const updated = fs.readFileSync(`${__dirname}/test_metatype_key_removal_err.owl`);
        container = await containerImport.ImportOntology(user, containerInput, updated, false, true, containerID);

        expect(container.isError).true;

        await storage.Delete(containerID);
        return storage.Delete(container.value);
    });

    it('can prevent container update when a metatype relationship pair to be removed has associated data', async () => {
        // using the Action class/metatype
        const containerImport = ContainerImport.Instance;
        const storage = ContainerMapper.Instance;
        const metatypeRepository = new MetatypeRepository();
        const pairRepo = new MetatypeRelationshipPairRepository();
        const nodeStorage = NodeMapper.Instance;
        const edgeStorage = EdgeMapper.Instance;

        const containerInput = {
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            data_versioning_enabled: false,
            ontology_versioning_enabled: false,
        };
        let containerID: string;

        const original = fs.readFileSync(`${__dirname}/test.owl`);

        let container = await containerImport.ImportOntology(user, containerInput, original, false, false, '');

        expect(container.isError).false;
        expect(container.value).not.empty;

        // retrieve container so we get the graph itself
        const retrievedContainer = await containerRepo.findByID(container.value);
        expect(retrievedContainer.isError).false;
        containerID = retrievedContainer.value.id!;

        const metatype = await metatypeRepository.where().containerID('eq', containerID).and().name('eq', 'Action').list(false);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const metatypeID = metatype.value[0].id;
        const nodeCreate = await nodeStorage.BulkCreateOrUpdateByCompositeID('test suite', [
            new Node({
                container_id: containerID,
                metatype: metatypeID!,
                properties: {name: 'test action 1'},
            }),
            new Node({
                container_id: containerID,
                metatype: metatypeID!,
                properties: {name: 'test action 2'},
            }),
        ]);

        expect(nodeCreate.isError).false;

        // retrieve Action metatype ID
        const actionMetatype = await metatypeRepository.where().containerID('eq', containerID).and().name('eq', 'Action').list(false);
        const actionMetatypeID = actionMetatype.value[0].id!;

        // retrieve relationship pair
        const pairs = await pairRepo
            .where()
            .containerID('eq', containerID)
            .and()
            .origin_metatype_id('eq', actionMetatypeID)
            .and()
            .destination_metatype_id('eq', actionMetatypeID)
            .list(false);
        expect(pairs.isError).false;

        const relationshipPair = pairs.value[0];

        const relationshipPairID = relationshipPair.id;
        const originID = nodeCreate.value[0].id;
        const destinationID = nodeCreate.value[1].id;

        const edgeCreate = await edgeStorage.Create(
            containerID,
            new Edge({
                container_id: containerID,
                metatype_relationship_pair: relationshipPairID!,
                properties: {},
                origin_id: originID,
                destination_id: destinationID,
            }),
        );

        expect(edgeCreate.isError).false;

        const updated = fs.readFileSync(`${__dirname}/test_metatype_relationship_removal_err.owl`);

        container = await containerImport.ImportOntology(user, containerInput, updated, false, true, containerID);

        expect(container.isError).true;

        await storage.Delete(containerID);
        return storage.Delete(container.value);
    });

    it('can remove deleted metatypes, metatype keys, relationship pairs, and relationships from the container with no associated data', async () => {
        // using Action, Document, and Equipment classes/metatypes and caused by/causes relationships
        const containerImport = ContainerImport.Instance;
        const storage = ContainerMapper.Instance;

        const containerInput = {
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            data_versioning_enabled: false,
            ontology_versioning_enabled: false,
        };
        let containerID: string;

        const original = fs.readFileSync(`${__dirname}/test.owl`);
        let container = await containerImport.ImportOntology(user, containerInput, original, false, false, '');

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value;

        const updated = fs.readFileSync(`${__dirname}/test_successful_removal_update.owl`);
        container = await containerImport.ImportOntology(user, containerInput, updated, false, true, containerID);

        expect(container.isError).false;
        expect(container.value).not.empty;

        await storage.Delete(containerID);
        return storage.Delete(container.value);
    });
});
