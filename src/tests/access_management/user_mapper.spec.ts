import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_access_layer/mappers/db_adapters/postgres/postgres";
import Logger from "../../services/logger";
import UserMapper from "../../data_access_layer/mappers/access_management/user_mapper";
import {User} from "../../access_management/user";

describe('A User', async() => {

    before(function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping container tests, no storage layer");
           this.skip()
       }

       return PostgresAdapter.Instance.init()
    });

    it('can be saved to storage', async()=> {
        const storage = UserMapper.Instance;

        const user= await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(user.isError).false;
        expect(user.value).not.empty;

        return storage.PermanentlyDelete(user.value.id!)
    });

    it('can have their email validated', async()=> {
        const storage = UserMapper.Instance;

        const user= await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(user.isError).false;
        expect(user.value).not.empty;

        const validated = await storage.ValidateEmail(user.value.id!,user.value.email_validation_token!)

        expect(validated.isError).false;
        expect(validated.value).true;

        return storage.PermanentlyDelete(user.value.id!)
    });

    it('can have reset token set', async()=> {
        const storage = UserMapper.Instance;

        const user= await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(user.isError).false;
        expect(user.value).not.empty;

        const reset = await storage.SetResetToken(user.value.id!)

        expect(reset.isError).false;
        expect(reset.value).true;

        return storage.PermanentlyDelete(user.value.id!)
    });

    it('can be retrieved from  storage', async()=> {
        const storage = UserMapper.Instance;

        const user= await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(user.isError).false;
        expect(user.value).not.empty;

        const retrieved = await storage.Retrieve(user.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(user.value.id);

        return storage.PermanentlyDelete(user.value.id!)
    });

    it('can be listed from storage', async()=> {
        const storage = UserMapper.Instance;

        const user= await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(user.isError).false;
        expect(user.value).not.empty;

        const retrieved = await storage.List();
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return storage.PermanentlyDelete(user.value.id!)
    });

    it('can be updated in storage', async()=> {
        const storage = UserMapper.Instance;

        const user= await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(user.isError).false;
        expect(user.value).not.empty;

        const updatedName = faker.name.findName();
        const updatedEmail = faker.internet.email();
        user.value.display_name = updatedName
        user.value.email = updatedEmail

        const updateResult = await storage.Update(user.value.id!, user.value);
        expect(updateResult.isError).false;

        const retrieved = await storage.Retrieve(user.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(user.value.id);
        expect(retrieved.value.display_name).eq(updatedName);
        expect(retrieved.value.email).eq(updatedEmail);

        return storage.PermanentlyDelete(user.value.id!)
    })
});
