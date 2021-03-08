/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import 'reflect-metadata';
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerImport from "../../data_access_layer/mappers/import/container_import"
import fs from 'fs'
import ContainerMapper from '../../data_access_layer/mappers/container_mapper';
import NodeStorage from '../../data_access_layer/mappers/graph/node_storage';
import MetatypeStorage from '../../data_access_layer/mappers/metatype_mapper';
import MetatypeRelationshipPairStorage from '../../data_access_layer/mappers/metatype_relationship_pair_storage';
import EdgeStorage from '../../data_access_layer/mappers/graph/edge_storage';
import { UserT } from '../../types/user_management/userT';

describe('A Container Import', async() => {

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping container import tests, no storage layer");
            this.skip()
        }
        await PostgresAdapter.Instance.init()
        return Promise.resolve()
    });


    it('can create a container from a valid ontology file', async()=> {
        let containerImport = ContainerImport.Instance;
        let storage = ContainerMapper.Instance;

        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}

        let fileBuffer = await fs.readFileSync(`${__dirname}/test.owl`)

        let container = await containerImport.ImportOntology(user, {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}, fileBuffer, false, false, '');

        expect(container.isError, `container creation from ontology failed: ${container.error}`).false;
        expect(container.value).not.empty;

        return storage.Delete(container.value)

    });


    it('can update a container with a valid ontology file', async()=> {
        let containerImport = ContainerImport.Instance;
        let storage = ContainerMapper.Instance;

        let containerInput = {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}
        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}
        let containerID: string

        const original = fs.readFileSync(`${__dirname}/test.owl`)

        let container = await containerImport.ImportOntology(user, containerInput, original, false, false, '');

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value

        const updated = fs.readFileSync(`${__dirname}/test_update.owl`)

        container = await containerImport.ImportOntology(user, containerInput, updated, false, true, containerID);

        expect(container.isError).false;
        expect(container.value).not.empty;

        return storage.Delete(container.value)
    });

    it('can prevent container update when a metatype to be removed has associated data', async()=> {
        // using the Document class/metatype
        let containerImport = ContainerImport.Instance;
        let storage = ContainerMapper.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let nodeStorage = NodeStorage.Instance;

        let containerInput = {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}
        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}
        let containerID: string

        const original = fs.readFileSync(`${__dirname}/test.owl`)
        let container = await containerImport.ImportOntology(user, containerInput, original, false, false, '');

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value

        let metatype = await metatypeStorage.List(containerID, 0, 1, 'Document')

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let metatypeID = metatype.value[0].id
        let nodeCreate = await nodeStorage.CreateOrUpdateByActiveGraph(containerID, {metatype_id: metatypeID, properties: {'name': 'test document'}})

        expect(nodeCreate.isError).false;

        const updated = fs.readFileSync(`${__dirname}/test_metatype_removal_err.owl`)
        container = await containerImport.ImportOntology("test suite", containerInput, updated, false, true, containerID);

        expect(container.isError).true;

        return storage.Delete(container.value)
    });

    it('can prevent container update when a metatype key to be removed is for a metatype with associated data', async()=> {
        // using the Document class/metatype
        let containerImport = ContainerImport.Instance;
        let storage = ContainerMapper.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let nodeStorage = NodeStorage.Instance;

        let containerInput = {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}
        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}
        let containerID: string

        const original = fs.readFileSync(`${__dirname}/test.owl`)
        let container = await containerImport.ImportOntology(user, containerInput, original, false, false, '');

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value

        let metatype = await metatypeStorage.List(containerID, 0, 1, 'Document')

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let metatypeID = metatype.value[0].id
        let nodeCreate = await nodeStorage.CreateOrUpdateByActiveGraph(containerID, {metatype_id: metatypeID, properties: {'name': 'test document'}})

        expect(nodeCreate.isError).false;

        const updated = fs.readFileSync(`${__dirname}/test_metatype_key_removal_err.owl`)
        container = await containerImport.ImportOntology("test suite", containerInput, updated, false, true, containerID);

        expect(container.isError).true;

        return storage.Delete(container.value)
    });

    it('can prevent container update when a metatype relationship pair to be removed has associated data', async()=> {
        // using the Action class/metatype
        let containerImport = ContainerImport.Instance;
        let storage = ContainerMapper.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let relationshipStorage = MetatypeRelationshipPairStorage.Instance;
        let nodeStorage = NodeStorage.Instance;
        let edgeStorage = EdgeStorage.Instance;

        let containerInput = {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}
        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}
        let containerID: string

        const original = fs.readFileSync(`${__dirname}/test.owl`)

        let container = await containerImport.ImportOntology(user, containerInput, original, false, false, '');

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value

        let metatype = await metatypeStorage.List(containerID, 0, 1, 'Action')

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let metatypeID = metatype.value[0].id
        let nodeCreate = await nodeStorage.CreateOrUpdateByActiveGraph(containerID, {metatype_id: metatypeID, properties: {'name': 'test action 1'}})
        let nodeCreate2 = await nodeStorage.CreateOrUpdateByActiveGraph(containerID, {metatype_id: metatypeID, properties: {'name': 'test action 2'}})

        expect(nodeCreate.isError).false;
        expect(nodeCreate2.isError).false;

        // retrieve Action metatype ID
        let actionMetatype = await metatypeStorage.List(containerID, 0, 1, 'Action')
        let actionMetatypeID = actionMetatype.value[0].id!

        // retrieve relationship pair
        let relationshipPair = await relationshipStorage.RetrieveByMetatypes(actionMetatypeID, actionMetatypeID)

        expect(relationshipPair.isError).false;

        let relationshipPairID = relationshipPair.value.id
        let originID = nodeCreate.value[0].id
        let destinationID = nodeCreate2.value[0].id

        let edgeCreate = await edgeStorage.CreateOrUpdateByActiveGraph(containerID,
            {
                relationship_pair_id: relationshipPairID,
                container_id: containerID,
                properties: {},
                origin_node_id: originID,
                destination_node_id: destinationID
            })

        expect(edgeCreate.isError).false;

        const updated = fs.readFileSync(`${__dirname}/test_metatype_relationship_removal_err.owl`)

        container = await containerImport.ImportOntology("test suite", containerInput, updated, false, true, containerID);

        expect(container.isError).true;

        return storage.Delete(container.value)
    })

    it('can remove deleted metatypes, metatype keys, relationship pairs, and relationships from the container with no associated data', async()=> {
        // using Action, Document, and Equipment classes/metatypes and caused by/causes relationships
        let containerImport = ContainerImport.Instance;
        let storage = ContainerMapper.Instance;

        let containerInput = {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}
        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}
        let containerID: string

        const original = fs.readFileSync(`${__dirname}/test.owl`)
        let container = await containerImport.ImportOntology(user, containerInput, original, false, false, '');

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value

        const updated = fs.readFileSync(`${__dirname}/test_successful_removal_update.owl`)
        container = await containerImport.ImportOntology(user, containerInput, updated, false, true, containerID);

        expect(container.isError).false;
        expect(container.value).not.empty;

        return storage.Delete(container.value)
    });
});
