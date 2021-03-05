/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import 'reflect-metadata';
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import Logger from "../../logger";
import Container from "../../data_warehouse/ontology/container";

describe('A Container Mapper', async() => {

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping container tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init()

        return Promise.resolve()
    });

    it('can save to storage', async()=> {
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container(faker.name.findName(), faker.random.alphaNumeric()));

        expect(container.isError).false;
        expect(container.value.id).not.null

        return mapper.Delete(container.value.id!)
    });

    it('can bulk save to storage', async()=> {
        let mapper = ContainerStorage.Instance;

        const container1 = new Container(faker.name.findName(), faker.random.alphaNumeric())
        const container2 = new Container(faker.name.findName(), faker.random.alphaNumeric())

        let container = await mapper.BulkCreate("test suite", [container1, container2]);

        expect(container.isError).false;
        expect(container.value).not.empty;

        return mapper.Delete(container.value[0].id!)
    });

    it('can be retrieve from storage', async()=> {
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container(faker.name.findName(), faker.random.alphaNumeric()));

        expect(container.isError).false;
        expect(container.value).not.empty;

        let retrieved = await mapper.Retrieve(container.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(container.value.id);

        return mapper.Delete(container.value.id!)
    });

    it('can list from storage', async()=> {
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container(faker.name.findName(), faker.random.alphaNumeric()));

        expect(container.isError).false;
        expect(container.value).not.empty;

        let retrieved = await mapper.List();
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return mapper.Delete(container.value.id!)
    });

    it('can update in storage', async()=> {
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container(faker.name.findName(), faker.random.alphaNumeric()));

        expect(container.isError).false;
        expect(container.value).not.empty;

        let updatedName = faker.name.findName();
        let updatedDescription = faker.random.alphaNumeric();
        container.value.name = updatedName
        container.value.description = updatedDescription

        let updateResult = await mapper.Update(" test suite",container.value);
        expect(updateResult.isError).false;

        let retrieved = await mapper.Retrieve(container.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(container.value.id);
        expect(retrieved.value.name).eq(updatedName);
        expect(retrieved.value.description).eq(updatedDescription);

        return mapper.Delete(container.value.id!)
    })

    it('can bulk update in storage', async()=> {
        let mapper = ContainerStorage.Instance;

        const container1 = new Container(faker.name.findName(), faker.random.alphaNumeric())
        const container2 = new Container(faker.name.findName(), faker.random.alphaNumeric())

        let containers = await mapper.BulkCreate("test suite", [container1, container2]);

        expect(containers.isError).false;
        expect(containers.value).not.empty;

        let updatedName = faker.name.findName();
        let updatedName2 = faker.name.findName();
        let updatedDescription = faker.random.alphaNumeric();
        let updatedDescription2 = faker.random.alphaNumeric();
        containers.value[0].name = updatedName
        containers.value[1].name = updatedName2
        containers.value[0].description = updatedDescription
        containers.value[1].description = updatedDescription2

        let updateResult = await mapper.BulkUpdate(" test suite", containers.value);
        expect(updateResult.isError).false;

        for(const container of updateResult.value) {
            expect(container.name).to.be.oneOf([updatedName,updatedName2])
            expect(container.description).to.be.oneOf([updatedDescription, updatedDescription2])
            await mapper.Delete(container.id!)
        }

        return Promise.resolve()
    });
});
