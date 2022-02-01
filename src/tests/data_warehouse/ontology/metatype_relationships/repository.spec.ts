import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import MetatypeRelationshipRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import MetatypeRelationshipKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import {User} from '../../../../domain_objects/access_management/user';

describe('A Metatype Relationship Repository', async () => {
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

    it('can save a Metatype Relationship', async () => {
        const repository = new MetatypeRelationshipRepository();
        const relationship = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        let results = await repository.save(relationship, user);
        expect(results.isError).false;
        expect(relationship.id).not.undefined;

        // now run an update
        const updatedName = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        relationship.name = updatedName;
        relationship.description = updatedDescription;

        results = await repository.save(relationship, user);
        expect(results.isError).false;
        expect(relationship.id).not.undefined;
        expect(relationship.name).eq(updatedName);
        expect(relationship.description).eq(updatedDescription);

        return repository.delete(relationship);
    });

    it('can save a Metatype Relationship with keys', async () => {
        const repository = new MetatypeRelationshipRepository();
        const relationship = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const key = new MetatypeRelationshipKey({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            required: true,
            property_name: 'test_property',
            data_type: 'string',
        });
        relationship.addKey(key);

        let results = await repository.save(relationship, user);
        expect(results.isError, results.error?.error).false;
        expect(relationship.id).not.undefined;
        expect(relationship.keys!).not.empty;
        expect(relationship.keys![0].id).not.undefined;

        // now run an update
        const updatedName = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        relationship.name = updatedName;
        relationship.description = updatedDescription;
        relationship.keys![0].name = updatedName;
        relationship.keys![0].description = updatedDescription;

        results = await repository.save(relationship, user);
        expect(results.isError, results.error?.error).false;
        expect(relationship.id).not.undefined;
        expect(relationship.name).eq(updatedName);
        expect(relationship.description).eq(updatedDescription);
        expect(relationship.keys![0].name).eq(updatedName);
        expect(relationship.keys![0].description).eq(updatedDescription);

        // now remove the keys and save again
        relationship.removeKey(relationship.keys![0]);
        expect(relationship.keys!.length).eq(0);

        results = await repository.save(relationship, user);
        expect(results.isError, results.error?.error).false;
        expect(relationship.id).not.undefined;
        expect(relationship.name).eq(updatedName);
        expect(relationship.description).eq(updatedDescription);
        expect(relationship.keys!.length).eq(0);

        return repository.delete(relationship);
    });

    it('can save multiple Metatype Relationships', async () => {
        const repository = new MetatypeRelationshipRepository();
        const relationship1 = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const relationship2 = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        let results = await repository.bulkSave(user, [relationship1, relationship2]);
        expect(results.isError).false;

        // now run an update
        const updatedName = faker.name.findName();
        const updatedName2 = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        const updatedDescription2 = faker.random.alphaNumeric();
        relationship1.name = updatedName;
        relationship2.name = updatedName2;
        relationship1.description = updatedDescription;
        relationship2.description = updatedDescription2;

        results = await repository.bulkSave(user, [relationship1, relationship2]);
        expect(results.isError).false;

        for (const relationship of [relationship1, relationship2]) {
            expect(relationship.name).to.be.oneOf([updatedName, updatedName2]);
            expect(relationship.description).to.be.oneOf([updatedDescription, updatedDescription2]);
            await repository.delete(relationship);
        }

        return Promise.resolve();
    });

    it('can save multiple Metatype Relationships with keys', async () => {
        const repository = new MetatypeRelationshipRepository();
        const relationship1 = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const relationship2 = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        // we'll use the same key for ease of use
        const key = new MetatypeRelationshipKey({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            required: true,
            property_name: 'test_property',
            data_type: 'string',
        });
        relationship1.addKey(key);
        relationship2.addKey(key);

        let results = await repository.bulkSave(user, [relationship1, relationship2]);
        expect(results.isError).false;

        for (const relationship of [relationship1, relationship2]) {
            expect(relationship.keys![0].name).eq(key.name);
            expect(relationship.keys![0].description).eq(key.description);
        }

        // now run an update
        const updatedName = faker.name.findName();
        const updatedName2 = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        const updatedDescription2 = faker.random.alphaNumeric();
        relationship1.name = updatedName;
        relationship2.name = updatedName2;
        relationship1.description = updatedDescription;
        relationship2.description = updatedDescription2;
        relationship1.keys![0].name = updatedName;
        relationship1.keys![0].description = updatedDescription;
        relationship2.keys![0].name = updatedName;
        relationship2.keys![0].description = updatedDescription;

        results = await repository.bulkSave(user, [relationship1, relationship2]);
        expect(results.isError).false;

        for (const relationship of [relationship1, relationship2]) {
            expect(relationship.name).to.be.oneOf([updatedName, updatedName2]);
            expect(relationship.description).to.be.oneOf([updatedDescription, updatedDescription2]);
            expect(relationship.keys![0].name).eq(updatedName);
            expect(relationship.keys![0].description).eq(updatedDescription);

            await repository.delete(relationship);
        }

        return Promise.resolve();
    });

    it('can find a Metatype Relationship by id', async () => {
        const repository = new MetatypeRelationshipRepository();
        const relationship = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const results = await repository.save(relationship, user);
        expect(results.isError).false;
        expect(relationship.id).not.undefined;

        const retrieved = await repository.findByID(relationship.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(relationship.id);

        return repository.delete(relationship);
    });

    it('can deletea Metatype Relationship', async () => {
        const repository = new MetatypeRelationshipRepository();
        const relationship = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const results = await repository.save(relationship, user);
        expect(results.isError).false;
        expect(relationship.id).not.undefined;

        return repository.delete(relationship);
    });

    it('can query and list Metatype Relationships', async () => {
        const repository = new MetatypeRelationshipRepository();
        const relationship1 = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const relationship2 = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const saved = await repository.bulkSave(user, [relationship1, relationship2]);
        expect(saved.isError).false;

        // simple list first
        let results = await repository.list(false, {limit: 1, offset: 0});
        expect(results.isError).false;
        expect(results.value).not.empty;
        expect(results.value.length).eq(1);

        // now some more complicated queries
        results = await repository.where().name('eq', relationship1.name).findAll();
        expect(results.isError).false;
        expect(results.value).not.empty;
        expect(results.value[0].name).eq(relationship1.name);

        results = await repository.where().description('eq', relationship1.description).findAll();
        expect(results.isError).false;
        expect(results.value).not.empty;
        expect(results.value[0].description).eq(relationship1.description);

        results = await repository.where().containerID('eq', containerID).findAll();
        expect(results.isError).false;
        expect(results.value).not.empty;
        expect(results.value.length).eq(2);

        // test count finally
        const count = await repository.where().containerID('eq', containerID).count();
        expect(count.isError).false;
        expect(count.value).eq(2);

        return Promise.resolve();
    });
});
