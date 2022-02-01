import faker from 'faker';
import {expect} from 'chai';
import 'reflect-metadata';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../../../services/logger';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';

describe('A Container Mapper', async () => {
    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping container tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();

        return Promise.resolve();
    });

    after(async () => {
        await PostgresAdapter.Instance.close();
    });

    it('can save to storage', async () => {
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

        return mapper.Delete(container.value.id!);
    });

    it('can bulk save to storage', async () => {
        const mapper = ContainerStorage.Instance;

        const container1 = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const container2 = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const containers = await mapper.BulkCreate('test suite', [container1, container2]);

        expect(containers.isError).false;
        expect(containers.value).not.empty;

        for (const container of containers.value) {
            mapper.Delete(container.id!);
        }
        return Promise.resolve();
    });

    it('can be retrieve from storage', async () => {
        const mapper = ContainerStorage.Instance;

        const container = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(container.isError).false;
        expect(container.value).not.empty;

        const retrieved = await mapper.Retrieve(container.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(container.value.id);

        return mapper.Delete(container.value.id!);
    });

    it('can list from storage', async () => {
        const mapper = ContainerStorage.Instance;

        const container = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(container.isError).false;
        expect(container.value).not.empty;

        const retrieved = await mapper.List();
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return mapper.Delete(container.value.id!);
    });

    it('can update in storage', async () => {
        const mapper = ContainerStorage.Instance;

        const container = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(container.isError).false;
        expect(container.value).not.empty;

        const updatedName = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        container.value.name = updatedName;
        container.value.description = updatedDescription;

        const updateResult = await mapper.Update(' test suite', container.value);
        expect(updateResult.isError).false;

        const retrieved = await mapper.Retrieve(container.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(container.value.id);
        expect(retrieved.value.name).eq(updatedName);
        expect(retrieved.value.description).eq(updatedDescription);

        return mapper.Delete(container.value.id!);
    });

    it('can bulk update in storage', async () => {
        const mapper = ContainerStorage.Instance;

        const container1 = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const container2 = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const containers = await mapper.BulkCreate('test suite', [container1, container2]);

        expect(containers.isError).false;
        expect(containers.value).not.empty;

        const updatedName = faker.name.findName();
        const updatedName2 = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        const updatedDescription2 = faker.random.alphaNumeric();
        containers.value[0].name = updatedName;
        containers.value[1].name = updatedName2;
        containers.value[0].description = updatedDescription;
        containers.value[1].description = updatedDescription2;

        const updateResult = await mapper.BulkUpdate(' test suite', containers.value);
        expect(updateResult.isError).false;

        for (const container of updateResult.value) {
            expect(container.name).to.be.oneOf([updatedName, updatedName2]);
            expect(container.description).to.be.oneOf([updatedDescription, updatedDescription2]);
            await mapper.Delete(container.id!);
        }

        return Promise.resolve();
    });
});
