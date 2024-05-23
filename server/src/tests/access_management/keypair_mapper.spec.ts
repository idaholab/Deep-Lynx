import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../services/logger';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import KeyPairMapper from '../../data_access_layer/mappers/access_management/keypair_mapper';
import {KeyPair, User} from '../../domain_objects/access_management/user';
import KeyPairRepository from '../../data_access_layer/repositories/access_management/keypair_repository';

describe('A KeyPair', async () => {
    before(function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping container tests, no storage layer');
            this.skip();
        }

        return PostgresAdapter.Instance.init();
    });

    after(async () => {
        return PostgresAdapter.Instance.close();
    });

    it('can be created', async () => {
        const storage = UserMapper.Instance;

        const user = await storage.Create(
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

        expect(user.isError).false;
        expect(user.value).not.empty;

        const kp = new KeyPair(user.value.id!);
        expect((await kp.setSecret()).isError).false;

        const keypair = await KeyPairMapper.Instance.Create(kp);
        expect(keypair.isError).false;

        const keypairDelete = await KeyPairMapper.Instance.Delete(keypair.value.key);
        expect(keypairDelete.isError).false;

        return storage.Delete(user.value.id!);
    });

    it('can be validated', async () => {
        const storage = UserMapper.Instance;

        const user = await storage.Create(
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

        expect(user.isError).false;
        expect(user.value).not.empty;

        const kp = new KeyPair(user.value.id!);
        expect((await kp.setSecret()).isError).false;

        const keypair = await KeyPairMapper.Instance.Create(kp);
        expect(keypair.isError).false;

        const keyRepo = new KeyPairRepository();

        const validated = await keyRepo.validateKeyPair(keypair.value.key, keypair.value.secret_raw!);
        expect(validated).true;

        const invalidated = await keyRepo.validateKeyPair(keypair.value.key, 'fake key should fail');
        expect(invalidated).false;

        const keypairDelete = await KeyPairMapper.Instance.Delete(keypair.value.key);
        expect(keypairDelete.isError).false;

        return storage.Delete(user.value.id!);
        // @ts-ignore
    }).timeout(5000); // bcrypt takes its time
});
