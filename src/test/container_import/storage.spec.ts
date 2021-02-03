/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerImport from "../../data_storage/import/container_import"
import fs from 'fs'
import ContainerStorage from '../../data_storage/container_storage';
import NodeStorage from '../../data_storage/graph/node_storage';
import MetatypeStorage from '../../data_storage/metatype_storage';
import MetatypeRelationshipPairStorage from '../../data_storage/metatype_relationship_pair_storage';
import EdgeStorage from '../../data_storage/graph/edge_storage';
import { UserT } from '../../types/user_management/userT';
import { Authorization } from '../../user_management/authorization/authorization';
const Buffer = require('buffer').Buffer;

describe('A Container Import', async() => {

    before(function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping container import tests, no storage layer");
           this.skip()
       }

        return PostgresAdapter.Instance.init()
    });

    it('can create a container from a valid ontology file', async()=> {
        let containerImport = ContainerImport.Instance;
        let storage = ContainerStorage.Instance;

        let fileBuffer: Buffer = Buffer.alloc(0)
        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}

        fs.readFile(`${__dirname}/test.owl`, async function (err,data) {
            if (err) {
              return console.log(err);
            }
            fileBuffer = data;
            let container = await containerImport.ImportOntology(user, {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}, fileBuffer, false, false, '');

            expect(container.isError).false;
            expect(container.value).not.empty;

            return storage.PermanentlyDelete(container.value)
        });
        
    });

    
    it('can update a container with a valid ontology file', async()=> {
        let containerImport = ContainerImport.Instance;
        let storage = ContainerStorage.Instance;

        let fileBuffer: Buffer = Buffer.alloc(0)
        let containerInput = {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}
        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}
        let containerID: string

        fs.readFile(`${__dirname}/test.owl`, async function (err,data) {
            if (err) {
              return console.log(err);
            }
            fileBuffer = data;
            let container = await containerImport.ImportOntology(user, containerInput, fileBuffer, false, false, '');

            expect(container.isError).false;
            expect(container.value).not.empty;
            containerID = container.value

            fs.readFile(`${__dirname}/test_update.owl`, async function(err,data) {
                if (err) {
                    return console.log(err);
                  }
                  fileBuffer = data;
                  let container = await containerImport.ImportOntology("test suite", containerInput, fileBuffer, false, true, containerID);
      
                  expect(container.isError).false;
                  expect(container.value).not.empty;

                  return storage.PermanentlyDelete(container.value)
            })
        });
    });

    it('can prevent container update when a metatype to be removed has associated data', async()=> {
        // using the Document class/metatype
        let containerImport = ContainerImport.Instance;
        let storage = ContainerStorage.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let nodeStorage = NodeStorage.Instance;

        let fileBuffer: Buffer = Buffer.alloc(0)
        let containerInput = {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}
        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}
        let containerID: string

        fs.readFile(`${__dirname}/test.owl`, async function (err,data) {
            if (err) {
              return console.log(err);
            }
            fileBuffer = data;
            let container = await containerImport.ImportOntology(user, containerInput, fileBuffer, false, false, '');

            expect(container.isError).false;
            expect(container.value).not.empty;
            containerID = container.value

            let metatype = await metatypeStorage.List(containerID, 0, 1, 'Document')

            expect(metatype.isError).false;
            expect(metatype.value).not.empty;

            let metatypeID = metatype.value[0].id
            let nodeCreate = await nodeStorage.CreateOrUpdateByActiveGraph(containerID, {metatype_id: metatypeID, properties: {'name': 'test document'}})

            expect(nodeCreate.isError).false;

            fs.readFile(`${__dirname}/test_metatype_removal_err.owl`, async function(err,data) {
                if (err) {
                    return console.log(err);
                  }
                  fileBuffer = data;
                  let container = await containerImport.ImportOntology("test suite", containerInput, fileBuffer, false, true, containerID);
      
                  expect(container.isError).true;

                  return storage.PermanentlyDelete(container.value)
            })
        });
    });

    it('can prevent container update when a metatype key to be removed is for a metatype with associated data', async()=> {
        // using the Document class/metatype
        let containerImport = ContainerImport.Instance;
        let storage = ContainerStorage.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let nodeStorage = NodeStorage.Instance;

        let fileBuffer: Buffer = Buffer.alloc(0)
        let containerInput = {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}
        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}
        let containerID: string

        fs.readFile(`${__dirname}/test.owl`, async function (err,data) {
            if (err) {
              return console.log(err);
            }
            fileBuffer = data;
            let container = await containerImport.ImportOntology(user, containerInput, fileBuffer, false, false, '');

            expect(container.isError).false;
            expect(container.value).not.empty;
            containerID = container.value

            let metatype = await metatypeStorage.List(containerID, 0, 1, 'Document')

            expect(metatype.isError).false;
            expect(metatype.value).not.empty;

            let metatypeID = metatype.value[0].id
            let nodeCreate = await nodeStorage.CreateOrUpdateByActiveGraph(containerID, {metatype_id: metatypeID, properties: {'name': 'test document'}})

            expect(nodeCreate.isError).false;

            fs.readFile(`${__dirname}/test_metatype_key_removal_err.owl`, async function(err,data) {
                if (err) {
                    return console.log(err);
                  }
                  fileBuffer = data;
                  let container = await containerImport.ImportOntology("test suite", containerInput, fileBuffer, false, true, containerID);
      
                  expect(container.isError).true;

                  return storage.PermanentlyDelete(container.value)
            })
        });
    });

    it('can prevent container update when a metatype relationship pair to be removed has associated data', async()=> {
        // using the Action class/metatype
        let containerImport = ContainerImport.Instance;
        let storage = ContainerStorage.Instance;
        let metatypeStorage = MetatypeStorage.Instance;
        let relationshipStorage = MetatypeRelationshipPairStorage.Instance;
        let nodeStorage = NodeStorage.Instance;
        let edgeStorage = EdgeStorage.Instance;

        let fileBuffer: Buffer = Buffer.alloc(0)
        let containerInput = {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}
        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}
        let containerID: string

        fs.readFile(`${__dirname}/test.owl`, async function (err,data) {
            if (err) {
              return console.log(err);
            }
            fileBuffer = data;
            let container = await containerImport.ImportOntology(user, containerInput, fileBuffer, false, false, '');

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

            let relationshipPair = await relationshipStorage.RetrieveByMetatypes('Action', 'Action')

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

            fs.readFile(`${__dirname}/test_metatype_relationship_removal_err.owl`, async function(err,data) {
                if (err) {
                    return console.log(err);
                  }
                  fileBuffer = data;
                  let container = await containerImport.ImportOntology("test suite", containerInput, fileBuffer, false, true, containerID);
      
                  expect(container.isError).true;

                  return storage.PermanentlyDelete(container.value)
            })
        });
    })

    it('can remove deleted metatypes, metatype keys, relationship pairs, and relationships from the container with no associated data', async()=> {
        // using Action, Document, and Equipment classes/metatypes and caused by/causes relationships
        let containerImport = ContainerImport.Instance;
        let storage = ContainerStorage.Instance;
        let authorization = Authorization.Instance.e;

        let fileBuffer: Buffer = Buffer.alloc(0)
        let containerInput = {"name": faker.name.findName(), "description": faker.random.alphaNumeric()}
        let user: UserT = {identity_provider: 'username_password', display_name: 'test suite', email: 'test@test.com', id: 'test suite'}
        let containerID: string

        fs.readFile(`${__dirname}/test.owl`, async function (err,data) {
            if (err) {
              return console.log(err);
            }
            fileBuffer = data;
            let container = await containerImport.ImportOntology(user, containerInput, fileBuffer, false, false, '');

            expect(container.isError).false;
            expect(container.value).not.empty;
            containerID = container.value

            fs.readFile(`${__dirname}/test_successful_removal.owl`, async function(err,data) {
                if (err) {
                    return console.log(err);
                  }
                  fileBuffer = data;
                  let container = await containerImport.ImportOntology("test suite", containerInput, fileBuffer, false, true, containerID);
      
                  expect(container.isError).false;
                  expect(container.value).not.empty;

                  return storage.PermanentlyDelete(container.value)
            })
        });
    });

});
