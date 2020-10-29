/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import ContainerStorage from "../../data_storage/container_storage";
import Logger from "../../logger";
import UserStorage from "../../data_storage/user_management/user_storage";
import {UserT} from "../../types/user_management/userT";
import KeyPairStorage from "../../data_storage/user_management/keypair_storage";

describe('A KeyPair', async() => {

    before(function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping container tests, no storage layer");
           this.skip()
       }

        return PostgresAdapter.Instance.init()
    });

    it('can be created', async()=> {
        let storage = UserStorage.Instance;

        let user = await storage.Create("test suite", (
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            } as UserT));

        expect(user.isError).false;
        expect(user.value).not.empty;

        let keypair = await KeyPairStorage.Instance.Create(user.value.id!)
        expect(keypair.isError).false

        return storage.PermanentlyDelete(user.value.id!)
    });

    it('can be validated', async()=> {
        let storage = UserStorage.Instance;

        let user = await storage.Create("test suite", (
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            } as UserT));

        expect(user.isError).false;
        expect(user.value).not.empty;

        let keypair = await KeyPairStorage.Instance.Create(user.value.id!)
        expect(keypair.isError).false

        let validated = await KeyPairStorage.Instance.ValidateKeyPair(keypair.value.key, keypair.value.secret_raw!)
        expect(validated).true

        let invalidated = await KeyPairStorage.Instance.ValidateKeyPair(keypair.value.key, "fake key should fail")
        expect(invalidated).false

        return storage.PermanentlyDelete(user.value.id!)
    }).timeout(5000); // bcrypt takes its time
});
