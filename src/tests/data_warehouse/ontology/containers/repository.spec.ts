/* tslint:disable */
import faker from 'faker'
import {expect} from 'chai'
import PostgresAdapter from "../../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import Logger from "../../../../services/logger";
import Container from "../../../../data_warehouse/ontology/container";
import UserMapper from "../../../../data_access_layer/mappers/access_management/user_mapper";
import ContainerRepository
    from "../../../../data_access_layer/repositories/data_warehouse/ontology/container_respository";
import Authorization from "../../../../access_management/authorization/authorization";
import {User} from "../../../../access_management/user";

describe('A Container Repository', async() => {
    let user: User

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping container tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init()

        const userResult = await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value

        return Promise.resolve()
    });

    it('can be saved', async()=> {
        const repository = new ContainerRepository()
        const container = new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()});

        let results = await repository.save(user, container)
        expect(results.isError).false
        expect(container.id).not.undefined

        // now run an update
        const updatedName = faker.name.findName()
        const updatedDescription = faker.random.alphaNumeric()
        container.name =  updatedName
        container.description =  updatedDescription

        results = await repository.save(user, container)
        expect(results.isError).false
        expect(container.id).not.undefined
        expect(container.name).eq(updatedName)
        expect(container.description).eq(updatedDescription)

        return repository.delete(container)
    });

    it('can be bulk saved', async()=> {
        const repository = new ContainerRepository()

        const container1 = new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()})
        const container2 = new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()})

        let results = await repository.bulkSave(user, [container1, container2])
        expect(results.isError).false;
        expect(container1.id).not.undefined
        expect(container2.id).not.undefined

        // now run an update
        const updatedName = faker.name.findName()
        const updatedName2 = faker.name.findName()
        const updatedDescription = faker.random.alphaNumeric()
        const updatedDescription2 = faker.random.alphaNumeric()
        container1.name =  updatedName
        container2.name =  updatedName2
        container1.description =  updatedDescription
        container2.description =  updatedDescription2

        results = await repository.bulkSave(user, [container1, container2])
        expect(results.isError).false


        for(const container of [container1, container2]) {
            expect(container.name).to.be.oneOf([updatedName,updatedName2])
            expect(container.description).to.be.oneOf([updatedDescription, updatedDescription2])
            await repository.delete(container)
        }

        return Promise.resolve()
    });

    it('can find container by ID', async()=> {
        const repository = new ContainerRepository()
        let container = new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()})

        const result = await repository.save(user, container);

        expect(result.isError).false;
        expect(container.id).not.undefined;

        const retrieved = await repository.findByID(container.id!)
        expect(retrieved.isError).false;
        expect(container.id).eq(retrieved.value.id);

        return repository.delete(container)
    });

    it('can list containers for user', async()=> {
        let repository = new ContainerRepository()

        const container1 = new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()})
        const container2 = new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()})

        const results = await repository.bulkSave(user, [container1, container2])
        expect(results.isError).false;
        expect(container1.id).not.undefined
        expect(container2.id).not.undefined

        // we must assign the user a role with that container as a domain before we attempt to list it
        const assigned = await Authorization.AssignRole(user.id!, "user", container1.id!)
        expect(assigned).true


        let retrieved = await repository.listForUser(user)
        expect(retrieved.isError).false;
        expect(retrieved.value.length).eq(1)
        expect(retrieved.value[0].id).eq(container1.id)

        await repository.delete(container1)
        await repository.delete(container2)

        return Promise.resolve()
    });

    it('can archive a container', async()=> {
        const repository = new ContainerRepository()
        const container = new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()});

        const results = await repository.save(user, container)
        expect(results.isError).false
        expect(container.id).not.undefined

        const archived = await repository.archive(user, container)
        expect(archived.isError).false

        return repository.delete(container)
    });
});
