/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_access_layer/mappers/db_adapters/postgres/postgres";
import Logger from "../../services/logger";
import UserMapper from "../../data_access_layer/mappers/access_management/user_mapper";
import KeyPairMapper from "../../data_access_layer/mappers/access_management/keypair_mapper";
import {KeyPair, User} from "../../access_management/user";
import KeyPairRepository from "../../data_access_layer/repositories/access_management/keypair_repository";

describe('A KeyPair', async() => {

    before(function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping container tests, no storage layer");
           this.skip()
       }

        return PostgresAdapter.Instance.init()
    });

    it('can be created', async()=> {
        let storage = UserMapper.Instance;

        let user = await storage.Create("test suite", new User(
            {
                identityProviderID: faker.random.uuid(),
                identityProvider: "username_password",
                admin: false,
                displayName: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(user.isError).false;
        expect(user.value).not.empty;

        let kp = new KeyPair(user.value.id!)
        expect((await kp.setSecret()).isError).false

        let keypair = await KeyPairMapper.Instance.Create(kp)
        expect(keypair.isError).false

        return storage.PermanentlyDelete(user.value.id!)
    });

    it('can be validated', async()=> {
        let storage = UserMapper.Instance;

        let user = await storage.Create("test suite", new User(
            {
                identityProviderID: faker.random.uuid(),
                identityProvider: "username_password",
                admin: false,
                displayName: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(user.isError).false;
        expect(user.value).not.empty;

        let kp = new KeyPair(user.value.id!)
        expect((await kp.setSecret()).isError).false

        let keypair = await KeyPairMapper.Instance.Create(kp)
        expect(keypair.isError).false

        let keyRepo = new KeyPairRepository()

        let validated = await keyRepo.validateKeyPair(keypair.value.key, keypair.value.secret_raw!)
        expect(validated).true

        let invalidated = await keyRepo.validateKeyPair(keypair.value.key, "fake key should fail")
        expect(invalidated).false

        return storage.PermanentlyDelete(user.value.id!)
    }).timeout(5000); // bcrypt takes its time
});
