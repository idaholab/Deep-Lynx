/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_access_layer/mappers/db_adapters/postgres/postgres";
import ContainerStorage from "../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import Logger from "../../services/logger";
import UserMapper from "../../data_access_layer/mappers/access_management/user_mapper";
import {UserT} from "../../types/user_management/userT";
import KeyPairMapper from "../../data_access_layer/mappers/access_management/keypair_mapper";

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

        let keypair = await KeyPairMapper.Instance.Create(user.value.id!)
        expect(keypair.isError).false

        return storage.PermanentlyDelete(user.value.id!)
    });

    it('can be validated', async()=> {
        let storage = UserMapper.Instance;

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

        let keypair = await KeyPairMapper.Instance.Create(user.value.id!)
        expect(keypair.isError).false

        let validated = await KeyPairMapper.Instance.ValidateKeyPair(keypair.value.key, keypair.value.secret_raw!)
        expect(validated).true

        let invalidated = await KeyPairMapper.Instance.ValidateKeyPair(keypair.value.key, "fake key should fail")
        expect(invalidated).false

        return storage.PermanentlyDelete(user.value.id!)
    }).timeout(5000); // bcrypt takes its time
});
