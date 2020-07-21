/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import ContainerStorage from "../../data_storage/container_storage";
import Logger from "../../logger";
import UserStorage from "../../data_storage/user_management/user_storage";
import {UserT} from "../../types/user_management/userT";

describe('A User', async() => {

    before(function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping container tests, no storage layer");
           this.skip()
       }

        return PostgresAdapter.Instance.init()
    });

    it('can be saved to storage', async()=> {
        let storage = UserStorage.Instance;

        let user = await storage.Create("test suite", (
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "basic",
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"],
                admin: false,
            } as UserT));

        expect(user.isError).false;
        expect(user.value).not.empty;

        return storage.PermanentlyDelete(user.value.id!)
    });

    it('can be retrieved from  storage', async()=> {
        let storage = UserStorage.Instance;

        let user = await storage.Create("test suite", (
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "basic",
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"],
                admin: false,
            } as UserT));

        expect(user.isError).false;
        expect(user.value).not.empty;

        let retrieved = await storage.Retrieve(user.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(user.value.id);

        return storage.PermanentlyDelete(user.value.id!)
    });

    it('can be listed from storage', async()=> {
        let storage = UserStorage.Instance;

        let user = await storage.Create("test suite", (
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "basic",
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"],
                admin: false,
            } as UserT));

        expect(user.isError).false;
        expect(user.value).not.empty;

        let retrieved = await storage.List(0, 100);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return storage.PermanentlyDelete(user.value.id!)
    });

    it('can be updated in storage', async()=> {
        let storage = UserStorage.Instance;

        let user = await storage.Create("test suite", (
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "basic",
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"],
                admin: false,
            } as UserT));

        expect(user.isError).false;
        expect(user.value).not.empty;

        let updatedName = faker.name.findName();
        let updatedEmail = faker.internet.email();

        let updateResult = await storage.Update(user.value.id!, " test suite",
            {display_name: updatedName, email: updatedEmail});
        expect(updateResult.isError).false;

        let retrieved = await storage.Retrieve(user.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(user.value.id);
        expect(retrieved.value.display_name).eq(updatedName);
        expect(retrieved.value.email).eq(updatedEmail);

        return storage.PermanentlyDelete(user.value.id!)
    })
});
