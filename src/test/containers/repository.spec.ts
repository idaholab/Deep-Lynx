/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_mappers/adapters/postgres/postgres";
import Logger from "../../logger";
import Container from "../../data_warehouse/ontology/container";
import {UserT} from "../../types/user_management/userT";
import UserStorage from "../../data_mappers/user_management/user_storage";
import ContainerRepository from "../../data_access_layer/repositories/container_respository";
import Authorization from "../../user_management/authorization/authorization";

describe('A Container Repository', async() => {
    let user: UserT

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping container tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init()

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

    it('can be saved', async()=> {
        let repository = new ContainerRepository()
        const container = new Container(faker.name.findName(), faker.random.alphaNumeric());

        let results = await repository.save(user, container)
        expect(results.isError).false
        expect(results.value.id).not.undefined

        // now run an update
        const updatedName = faker.name.findName()
        const updatedDescription = faker.random.alphaNumeric()
        results.value.name =  updatedName
        results.value.description =  updatedDescription

        results = await repository.save(user, results.value)
        expect(results.isError).false
        expect(results.value.id).not.undefined
        expect(results.value.name).eq(updatedName)
        expect(results.value.description).eq(updatedDescription)

        return repository.delete(results.value)
    });

    it('can be bulk saved', async()=> {
        let repository = new ContainerRepository()

        const container1 = new Container(faker.name.findName(), faker.random.alphaNumeric())
        const container2 = new Container(faker.name.findName(), faker.random.alphaNumeric())

        let results = await repository.bulkSave(user, [container1, container2])
        expect(results.isError).false;
        expect(results.value).not.empty;

        // now run an update
        const updatedName = faker.name.findName()
        const updatedName2 = faker.name.findName()
        const updatedDescription = faker.random.alphaNumeric()
        const updatedDescription2 = faker.random.alphaNumeric()
        results.value[0].name =  updatedName
        results.value[1].name =  updatedName2
        results.value[0].description =  updatedDescription
        results.value[1].description =  updatedDescription2

        results = await repository.bulkSave(user, results.value)
        expect(results.isError).false


        for(const container of results.value) {
            expect(container.name).to.be.oneOf([updatedName,updatedName2])
            expect(container.description).to.be.oneOf([updatedDescription, updatedDescription2])
            await repository.delete(container)
        }

        return Promise.resolve()
    });

    it('can find container by ID', async()=> {
        let repository = new ContainerRepository()

        const container = await repository.save(user, new Container(faker.name.findName(), faker.random.alphaNumeric()));

        expect(container.isError).false;
        expect(container.value).not.empty;

        let retrieved = await repository.findByID(container.value.id!)
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(container.value.id);

        return repository.delete(container.value)
    });

    it('can list containers for user', async()=> {
        let repository = new ContainerRepository()

        const container1 = new Container(faker.name.findName(), faker.random.alphaNumeric())
        const container2 = new Container(faker.name.findName(), faker.random.alphaNumeric())

        let results = await repository.bulkSave(user, [container1, container2])
        expect(results.isError).false;
        expect(results.value).not.empty;

        // we must assign the user a role with that container as a domain before we attempt to list it
        const assigned = await Authorization.AssignRole(user.id!, "user", results.value[0].id)
        expect(assigned).true


        let retrieved = await repository.listForUser(user)
        expect(retrieved.isError).false;
        expect(retrieved.value.length).eq(1)
        expect(retrieved.value[0].id).eq(results.value[0].id)

        await repository.delete(results.value[0])
        await repository.delete(results.value[1])

        return Promise.resolve()
    });

    it('can archive a container', async()=> {
        let repository = new ContainerRepository()
        const container = new Container(faker.name.findName(), faker.random.alphaNumeric());

        let results = await repository.save(user, container)
        expect(results.isError).false
        expect(results.value.id).not.undefined

        const archived = await repository.archive(user, results.value)
        expect(archived.isError).false
    });
});
