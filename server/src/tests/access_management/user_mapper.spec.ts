import faker from 'faker';
import { expect } from 'chai';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../services/logger';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import { User } from '../../domain_objects/access_management/user';
import ContainerMapper from "../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import Container from "../../domain_objects/data_warehouse/ontology/container";

describe('A User', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping container tests, no storage layer');
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

        return Promise.resolve()
    });

    after(async () => {
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can be saved to storage', async () => {
        const storage = UserMapper.Instance;

        const user = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser']
            })
        );

        expect(user.isError).false;
        expect(user.value).not.empty;

        return storage.Delete(user.value.id!);
    });

    it('service user can be added, listed, and deleted from container', async () => {
        const storage = UserMapper.Instance;

        const user = await storage.Create(
            'test suite',
            new User({
                identity_provider: 'service',
                admin: false,
                display_name: faker.name.findName(),
                type: 'service'
            })
        );

        expect(user.isError).false;
        expect(user.value).not.empty;

        const set = await storage.AddServiceUserToContainer(user.value.id!, containerID)
        expect(set.isError).false
        expect(set.value).true

        const containerServiceUsers = await storage.ListServiceUsersForContainer(containerID)
        expect(containerServiceUsers.isError).false

        const found = containerServiceUsers.value.find(u => u.id === user.value.id)
        expect(found).not.undefined

        return storage.DeleteServiceUser(user.value.id!, containerID);
    });

    it('can have their email validated', async () => {
        const storage = UserMapper.Instance;

        const user = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser']
            })
        );

        expect(user.isError).false;
        expect(user.value).not.empty;

        const validated = await storage.ValidateEmail(user.value.id!, user.value.email_validation_token!);

        expect(validated.isError).false;
        expect(validated.value).true;

        return storage.Delete(user.value.id!);
    });

    it('can have reset token set', async () => {
        const storage = UserMapper.Instance;

        const user = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser']
            })
        );

        expect(user.isError).false;
        expect(user.value).not.empty;

        const reset = await storage.SetResetToken(user.value.id!);

        expect(reset.isError).false;
        expect(reset.value).true;

        return storage.Delete(user.value.id!);
    });

    it('can be retrieved from  storage', async () => {
        const storage = UserMapper.Instance;

        const user = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser']
            })
        );

        expect(user.isError).false;
        expect(user.value).not.empty;

        const retrieved = await storage.Retrieve(user.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(user.value.id);

        return storage.Delete(user.value.id!);
    });

    it('can be listed from storage', async () => {
        const storage = UserMapper.Instance;

        const user = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser']
            })
        );

        expect(user.isError).false;
        expect(user.value).not.empty;

        const retrieved = await storage.List();
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return storage.Delete(user.value.id!);
    });

    it('can be updated in storage', async () => {
        const storage = UserMapper.Instance;

        const user = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser']
            })
        );

        expect(user.isError).false;
        expect(user.value).not.empty;

        const updatedName = faker.name.findName();
        const updatedEmail = faker.internet.email();
        user.value.display_name = updatedName;
        user.value.email = updatedEmail;

        const updateResult = await storage.Update(user.value.id!, user.value);
        expect(updateResult.isError).false;

        const retrieved = await storage.Retrieve(user.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(user.value.id);
        expect(retrieved.value.display_name).eq(updatedName);
        expect(retrieved.value.email).eq(updatedEmail);

        return storage.Delete(user.value.id!);
    });
});
