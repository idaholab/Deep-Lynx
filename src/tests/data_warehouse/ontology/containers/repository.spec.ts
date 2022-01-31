import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import ContainerRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/container_respository';
import {User} from '../../../../domain_objects/access_management/user';

describe('A Container Repository', async () => {
    let user: User;
    let user2: User;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping container tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();

        let userResult = await UserMapper.Instance.Create(
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

        userResult = await UserMapper.Instance.Create(
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
        user2 = userResult.value;

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        return PostgresAdapter.Instance.close();
    });

    it('can be saved', async () => {
        const repository = new ContainerRepository();
        const container = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        let results = await repository.save(container, user);
        expect(results.isError).false;
        expect(container.id).not.undefined;

        // now run an update
        const updatedName = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        container.name = updatedName;
        container.description = updatedDescription;

        results = await repository.save(container, user);
        expect(results.isError).false;
        expect(container.id).not.undefined;
        expect(container.name).eq(updatedName);
        expect(container.description).eq(updatedDescription);

        return repository.delete(container);
    });

    it('can be bulk saved', async () => {
        const repository = new ContainerRepository();

        const container1 = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const container2 = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        let results = await repository.bulkSave(user, [container1, container2]);
        expect(results.isError).false;
        expect(container1.id).not.undefined;
        expect(container2.id).not.undefined;

        // now run an update
        const updatedName = faker.name.findName();
        const updatedName2 = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        const updatedDescription2 = faker.random.alphaNumeric();
        container1.name = updatedName;
        container2.name = updatedName2;
        container1.description = updatedDescription;
        container2.description = updatedDescription2;

        results = await repository.bulkSave(user, [container1, container2]);
        expect(results.isError).false;

        for (const container of [container1, container2]) {
            expect(container.name).to.be.oneOf([updatedName, updatedName2]);
            expect(container.description).to.be.oneOf([updatedDescription, updatedDescription2]);
            await repository.delete(container);
        }

        return Promise.resolve();
    });

    it('can find container by ID', async () => {
        const repository = new ContainerRepository();
        const container = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const result = await repository.save(container, user);

        expect(result.isError).false;
        expect(container.id).not.undefined;

        const retrieved = await repository.findByID(container.id!);
        expect(retrieved.isError).false;
        expect(container.id).eq(retrieved.value.id);

        return repository.delete(container);
    });

    it('can list containers for user', async () => {
        const repository = new ContainerRepository();

        const container1 = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const container2 = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const container3 = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        let results = await repository.bulkSave(user, [container1, container2]);
        expect(results.isError).false;
        expect(container1.id).not.undefined;
        expect(container2.id).not.undefined;

        // now save one under user2 to verify we're not getting a container back
        // we don't own
        results = await repository.save(container3, user2);
        expect(results.isError).false;
        expect(container1.id).not.undefined;
        expect(container2.id).not.undefined;

        // admin role is immediately applied on bulk save, check this
        const retrieved = await repository.listForUser(user);
        expect(retrieved.isError).false;
        expect(retrieved.value.length).eq(2);
        expect(retrieved.value[0].id).eq(container1.id);

        await repository.delete(container1);
        await repository.delete(container2);

        return Promise.resolve();
    });

    it('can delete a container', async () => {
        const repository = new ContainerRepository();
        const container = new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const results = await repository.save(container, user);
        expect(results.isError).false;
        expect(container.id).not.undefined;

        return repository.delete(container);
    });
});
