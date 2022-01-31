import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import MetatypeRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import MetatypeKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import {User} from '../../../../domain_objects/access_management/user';

describe('A Metatype Repository', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping metatype tests, no mapper layer');
            this.skip();
        }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;

        const container = await mapper.Create(
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

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can save a Metatype', async () => {
        const repository = new MetatypeRepository();
        const metatype = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        let results = await repository.save(metatype, user);
        expect(results.isError).false;
        expect(metatype.id).not.undefined;

        // now run an update
        const updatedName = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        metatype.name = updatedName;
        metatype.description = updatedDescription;

        results = await repository.save(metatype, user);
        expect(results.isError).false;
        expect(metatype.id).not.undefined;
        expect(metatype.name).eq(updatedName);
        expect(metatype.description).eq(updatedDescription);

        return repository.delete(metatype);
    });

    it('can save a Metatype with keys!', async () => {
        const repository = new MetatypeRepository();
        const metatype = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const keys = [
            new MetatypeKey({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                required: true,
                property_name: 'test_property',
                data_type: 'string',
            }),
            new MetatypeKey({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
                required: true,
                property_name: 'test_property_2',
                data_type: 'string',
            }),
        ];
        metatype.addKey(...keys);

        let results = await repository.save(metatype, user);
        expect(results.isError).false;
        expect(metatype.id).not.undefined;
        expect(metatype.keys!).not.empty;
        expect(metatype.keys![0].id).not.undefined;

        // now run an update
        const updatedName = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        metatype.name = updatedName;
        metatype.description = updatedDescription;
        metatype.keys![0].name = updatedName;
        metatype.keys![0].description = updatedDescription;

        results = await repository.save(metatype, user);
        expect(results.isError).false;
        expect(metatype.id).not.undefined;
        expect(metatype.name).eq(updatedName);
        expect(metatype.description).eq(updatedDescription);
        expect(metatype.keys![0].name).eq(updatedName);
        expect(metatype.keys![0].description).eq(updatedDescription);

        // now remove the keys! and save again
        metatype.removeKey(metatype.keys![0]);
        expect(metatype.keys!.length).eq(1);

        results = await repository.save(metatype, user);
        expect(results.isError).false;
        expect(metatype.id).not.undefined;
        expect(metatype.name).eq(updatedName);
        expect(metatype.description).eq(updatedDescription);
        expect(metatype.keys!.length).eq(1);

        return repository.delete(metatype);
    });

    it('can save multiple Metatypes', async () => {
        const repository = new MetatypeRepository();
        const metatype1 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const metatype2 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        let results = await repository.bulkSave(user, [metatype1, metatype2]);
        expect(results.isError).false;
        expect(metatype1.id).not.undefined;
        expect(metatype2.id).not.undefined;

        // now run an update
        const updatedName = faker.name.findName();
        const updatedName2 = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        const updatedDescription2 = faker.random.alphaNumeric();
        metatype1.name = updatedName;
        metatype2.name = updatedName2;
        metatype1.description = updatedDescription;
        metatype2.description = updatedDescription2;

        results = await repository.bulkSave(user, [metatype1, metatype2]);
        expect(results.isError).false;

        for (const metatype of [metatype1, metatype2]) {
            expect(metatype.name).to.be.oneOf([updatedName, updatedName2]);
            expect(metatype.description).to.be.oneOf([updatedDescription, updatedDescription2]);
            await repository.delete(metatype);
        }

        return Promise.resolve();
    });

    it('can save multiple Metatypes with keys!', async () => {
        const repository = new MetatypeRepository();
        const metatype1 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const metatype2 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        // we'll use the same key for ease of use
        const key = new MetatypeKey({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            required: true,
            property_name: 'test_property',
            data_type: 'string',
        });
        metatype1.addKey(key);
        metatype2.addKey(key);

        let results = await repository.bulkSave(user, [metatype1, metatype2]);
        expect(results.isError).false;

        for (const metatype of [metatype1, metatype2]) {
            expect(metatype.keys![0].id).not.undefined;
            expect(metatype.keys![0].name).eq(key.name);
            expect(metatype.keys![0].description).eq(key.description);
        }

        // now run an update
        const updatedName = faker.name.findName();
        const updatedName2 = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        const updatedDescription2 = faker.random.alphaNumeric();
        metatype1.name = updatedName;
        metatype2.name = updatedName2;
        metatype1.description = updatedDescription;
        metatype2.description = updatedDescription2;
        metatype1.keys![0].name = updatedName;
        metatype1.keys![0].description = updatedDescription;
        metatype2.keys![0].name = updatedName;
        metatype2.keys![0].description = updatedDescription;

        results = await repository.bulkSave(user, [metatype1, metatype2]);
        expect(results.isError).false;

        for (const metatype of [metatype1, metatype2]) {
            expect(metatype.name).to.be.oneOf([updatedName, updatedName2]);
            expect(metatype.description).to.be.oneOf([updatedDescription, updatedDescription2]);
            expect(metatype.keys![0].id).not.undefined;
            expect(metatype.keys![0].name).eq(updatedName);
            expect(metatype.keys![0].description).eq(updatedDescription);

            await repository.delete(metatype);
        }

        return Promise.resolve();
    });

    it('can find a Metatype by id', async () => {
        const repository = new MetatypeRepository();
        const metatype = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const results = await repository.save(metatype, user);
        expect(results.isError).false;
        expect(metatype.id).not.undefined;

        const retrieved = await repository.findByID(metatype.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(metatype.id);

        return repository.delete(metatype);
    });

    it('can delete a Metatype', async () => {
        const repository = new MetatypeRepository();
        const metatype = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const results = await repository.save(metatype, user);
        expect(results.isError).false;
        expect(metatype.id).not.undefined;

        return repository.delete(metatype);
    });

    it('can query and list Metatypes', async () => {
        const repository = new MetatypeRepository();
        const metatype1 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const metatype2 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const updated = await repository.bulkSave(user, [metatype1, metatype2]);
        expect(updated.isError).false;

        // simple list first
        let results = await repository.list(false, {limit: 1, offset: 0});
        expect(results.isError).false;
        expect(results).not.empty;
        expect(results.value.length).eq(1);

        // now some more complicated queries
        results = await repository.where().name('eq', metatype1.name).findAll();
        expect(results.isError).false;
        expect(results).not.empty;
        expect(results.value[0].name).eq(metatype1.name);

        results = await repository.where().description('eq', metatype1.description).findAll();
        expect(results.isError).false;
        expect(results).not.empty;
        expect(results.value[0].description).eq(metatype1.description);

        results = await repository.where().containerID('eq', containerID).findAll();
        expect(results.isError).false;
        expect(results).not.empty;
        expect(results.value.length).eq(2);

        // test count finally
        const count = await repository.where().containerID('eq', containerID).count();
        expect(count.isError).false;
        expect(count.value).eq(2);

        return Promise.resolve();
    });
});
