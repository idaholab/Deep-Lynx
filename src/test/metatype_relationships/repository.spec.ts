/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";
import Container from "../../data_warehouse/ontology/container";
import MetatypeRelationship from "../../data_warehouse/ontology/metatype";
import {UserT} from "../../types/user_management/userT";
import UserStorage from "../../data_access_layer/mappers/user_management/user_storage";
import MetatypeRelationshipRepository from "../../data_access_layer/repositories/metatype_repository";
import MetatypeRelationshipKey from "../../data_warehouse/ontology/metatype_key";

describe('A Metatype Relationship Repository', async() => {
    let containerID:string = process.env.TEST_CONTAINER_ID || "";
    let user: UserT

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping metatype tests, no mapper layer");
           this.skip()
       }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;

        const container = await mapper.Create("test suite", new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        const result = await UserStorage.Instance.Create("test suite", (
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"],
                admin: false,
            } as UserT));

        expect(result.isError).false
        user = result.value

        return Promise.resolve()
    });

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('can save a Metatype Relationship', async()=> {
        const repository = new MetatypeRelationshipRepository()
        const relationship = new MetatypeRelationship({containerID,name: faker.name.findName(),description: faker.random.alphaNumeric()})

        let results = await repository.save(user, relationship)
        expect(results.isError).false
        expect(results.value.id).not.undefined

        // now run an update
        const updatedName = faker.name.findName()
        const updatedDescription = faker.random.alphaNumeric()
        results.value.name = updatedName
        results.value.description = updatedDescription

        results = await repository.save(user, results.value)
        expect(results.isError).false
        expect(results.value.id).not.undefined
        expect(results.value.name).eq(updatedName)
        expect(results.value.description).eq(updatedDescription)

        return repository.delete(results.value)
    });

    it('can save a Metatype Relationship with keys', async()=> {
        const repository = new MetatypeRelationshipRepository()
        const relationship = new MetatypeRelationship({containerID,name: faker.name.findName(),description: faker.random.alphaNumeric()})
        const key = new MetatypeRelationshipKey({name: faker.name.findName(), description: faker.random.alphaNumeric(), required: true, propertyName: "test_property", dataType: "string"})
        relationship.addKey(key)

        let results = await repository.save(user, relationship)
        expect(results.isError).false
        expect(results.value.id).not.undefined
        expect(results.value.keys).not.empty
        expect(results.value.keys[0].id).not.undefined

        // now run an update
        const updatedName = faker.name.findName()
        const updatedDescription = faker.random.alphaNumeric()
        results.value.name = updatedName
        results.value.description = updatedDescription
        results.value.keys[0].name = updatedName
        results.value.keys[0].description = updatedDescription

        results = await repository.save(user, results.value)
        expect(results.isError).false
        expect(results.value.id).not.undefined
        expect(results.value.name).eq(updatedName)
        expect(results.value.description).eq(updatedDescription)
        expect(results.value.keys[0].name).eq(updatedName)
        expect(results.value.keys[0].description).eq(updatedDescription)

        // now remove the keys and save again
        results.value.removeKey(results.value.keys[0])
        expect(results.value.keys.length).eq(0)

        results = await repository.save(user, results.value)
        expect(results.isError).false
        expect(results.value.id).not.undefined
        expect(results.value.name).eq(updatedName)
        expect(results.value.description).eq(updatedDescription)
        expect(results.value.keys.length).eq(0)

        return repository.delete(results.value)
    });

    it('can save multiple Metatype Relationships', async()=> {
        const repository = new MetatypeRelationshipRepository()
        const relationship1 = new MetatypeRelationship({containerID,name: faker.name.findName(),description: faker.random.alphaNumeric()})
        const relationship2 = new MetatypeRelationship({containerID,name: faker.name.findName(),description: faker.random.alphaNumeric()})

        let results = await repository.bulkSave(user, [relationship1, relationship2])
        expect(results.isError).false
        expect(results.value).not.empty

        // now run an update
        const updatedName = faker.name.findName()
        const updatedName2 = faker.name.findName()
        const updatedDescription = faker.random.alphaNumeric()
        const updatedDescription2 = faker.random.alphaNumeric()
        results.value[0].name = updatedName
        results.value[1].name = updatedName2
        results.value[0].description = updatedDescription
        results.value[1].description = updatedDescription2

        results = await repository.bulkSave(user, results.value)
        expect(results.isError).false

        for(const relationship of results.value) {
            expect(relationship.name).to.be.oneOf([updatedName, updatedName2])
            expect(relationship.description).to.be.oneOf([updatedDescription, updatedDescription2 ])
            await repository.delete(relationship)
        }


        return Promise.resolve()
    });

    it('can save multiple Metatype Relationships with keys', async()=> {
        const repository = new MetatypeRelationshipRepository()
        const relationship1 = new MetatypeRelationship({containerID,name: faker.name.findName(),description: faker.random.alphaNumeric()})
        const relationship2 = new MetatypeRelationship({containerID,name: faker.name.findName(),description: faker.random.alphaNumeric()})

        // we'll use the same key for ease of use
        const key = new MetatypeRelationshipKey({name: faker.name.findName(), description: faker.random.alphaNumeric(), required: true, propertyName: "test_property", dataType: "string"})
        relationship1.addKey(key)
        relationship2.addKey(key)

        let results = await repository.bulkSave(user, [relationship1, relationship2])
        expect(results.isError).false
        expect(results.value).not.empty

        for(const relationship of results.value) {
            expect(relationship.keys[0].name).eq(key.name)
            expect(relationship.keys[0].description).eq(key.description)
        }

        // now run an update
        const updatedName = faker.name.findName()
        const updatedName2 = faker.name.findName()
        const updatedDescription = faker.random.alphaNumeric()
        const updatedDescription2 = faker.random.alphaNumeric()
        results.value[0].name = updatedName
        results.value[1].name = updatedName2
        results.value[0].description = updatedDescription
        results.value[1].description = updatedDescription2
        results.value[0].keys[0].name = updatedName
        results.value[0].keys[0].description = updatedDescription
        results.value[1].keys[0].name = updatedName
        results.value[1].keys[0].description = updatedDescription

        results = await repository.bulkSave(user, results.value)
        expect(results.isError).false

        for(const relationship of results.value) {
            expect(relationship.name).to.be.oneOf([updatedName, updatedName2])
            expect(relationship.description).to.be.oneOf([updatedDescription, updatedDescription2 ])
            expect(relationship.keys[0].name).eq(updatedName)
            expect(relationship.keys[0].description).eq(updatedDescription)

            await repository.delete(relationship)
        }


        return Promise.resolve()
    });

    it('can find a Metatype Relationship by id', async()=> {
        const repository = new MetatypeRelationshipRepository()
        const metatype = new MetatypeRelationship({containerID,name: faker.name.findName(),description: faker.random.alphaNumeric()})

        let results = await repository.save(user, metatype)
        expect(results.isError).false
        expect(results.value.id).not.undefined

        let retrieved = await repository.findByID(results.value.id!)
        expect(retrieved.isError).false
        expect(retrieved.value.id).eq(results.value.id)

        return repository.delete(results.value)
    });

    it('can archive a Metatype Relationship', async()=> {
        const repository = new MetatypeRelationshipRepository()
        const metatype = new MetatypeRelationship({containerID,name: faker.name.findName(),description: faker.random.alphaNumeric()})

        const results = await repository.save(user, metatype)
        expect(results.isError).false
        expect(results.value.id).not.undefined

        const archived = await repository.archive(user, results.value)
        expect(archived.isError).false

        return repository.delete(results.value)
    });

    it('can query and list Metatype Relationships', async()=> {
        const repository = new MetatypeRelationshipRepository()
        const metatype1 = new MetatypeRelationship({containerID,name: faker.name.findName(),description: faker.random.alphaNumeric()})
        const metatype2 = new MetatypeRelationship({containerID,name: faker.name.findName(),description: faker.random.alphaNumeric()})

        let results = await repository.bulkSave(user, [metatype1, metatype2])
        expect(results.isError).false
        expect(results.value).not.empty

        // simple list first
        results = await repository.list(false, {limit: 1, offset: 0})
        expect(results.isError).false
        expect(results.value).not.empty
        expect(results.value.length).eq(1)

        // now some more complicated queries
        results = await repository.where().name("eq", metatype1.name).findAll()
        expect(results.isError).false
        expect(results.value).not.empty
        expect(results.value[0].name).eq(metatype1.name)

        results = await repository.where().description("eq", metatype1.description).findAll()
        expect(results.isError).false
        expect(results.value).not.empty
        expect(results.value[0].description).eq(metatype1.description)

        results = await repository.where().containerID("eq", containerID).findAll()
        expect(results.isError).false
        expect(results.value).not.empty
        expect(results.value.length).eq(2)

        // test count finally
        const count = await repository.where().containerID("eq", containerID).count()
        expect(count.isError).false
        expect(count.value).eq(2)

        return Promise.resolve()
    })
});
